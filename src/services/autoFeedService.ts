import { db } from '../db';
import type { FeedType, BroodingBatch } from '../types';

export interface AutoFeedExecutionResult {
  executed: boolean;
  layerKgDeducted: number;
  layerCostAmount: number;
  broodingKgDeducted: number;
  broodingCostAmount: number;
  broodingBatchesProcessed: number;
  datesProcessed: string[];
  summaryMessage: string;
}

// Progressive chick feed consumption table by age in days
export function getChickDailyConsumptionGrams(ageDays: number): { grams: number; recommendedType: FeedType } {
  if (ageDays <= 7) return { grams: 6, recommendedType: 'starter_24_27' };
  if (ageDays <= 14) return { grams: 12, recommendedType: 'starter_24_27' };
  if (ageDays <= 21) return { grams: 18, recommendedType: 'starter_24_27' };
  if (ageDays <= 28) return { grams: 24, recommendedType: 'grower_fattening' };
  if (ageDays <= 35) return { grams: 28, recommendedType: 'grower_fattening' };
  return { grams: 30, recommendedType: 'grower_fattening' };
}

let isRunningAutoDeduction = false;

/**
 * Automates daily feed consumption deduction for both layer production flock and active brooding batches.
 * Seamlessly catches up on any unrecorded days (e.g. if the app was closed yesterday or over the weekend).
 */
export async function executeAutomatedDailyFeedDeduction(
  currency: string = 'ريال يمني',
  recordedBy: string = 'النظام الذكي (أتمتة يومية تلقائية)'
): Promise<AutoFeedExecutionResult> {
  if (isRunningAutoDeduction) {
    return {
      executed: false,
      layerKgDeducted: 0,
      layerCostAmount: 0,
      broodingKgDeducted: 0,
      broodingCostAmount: 0,
      broodingBatchesProcessed: 0,
      datesProcessed: [],
      summaryMessage: 'عملية الخصم الآلي قيد التنفيذ حالياً.',
    };
  }

  isRunningAutoDeduction = true;

  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const datesProcessedSet = new Set<string>();

    let totalLayerKg = 0;
    let totalLayerCost = 0;
    let totalBroodingKg = 0;
    let totalBroodingCost = 0;
    let broodingBatchesCount = 0;

    // =========================================================================
    // PART 1: Automated Layer Flock Feed Consumption (30g/day per bird)
    // =========================================================================
    const tiers = await db.tiers.toArray();
    const rooms = await db.rooms.toArray();
    const totalLayerFemales =
      tiers.reduce((sum, t) => sum + (t.femalesCount || 0), 0) +
      rooms.reduce((sum, r) => sum + (r.femalesCount || 0), 0);
    const totalBreedingMales =
      tiers.reduce((sum, t) => sum + (t.malesCount || 0), 0) +
      rooms.reduce((sum, r) => sum + (r.malesCount || 0), 0);
    const totalLayerBreedingFlock = totalLayerFemales + totalBreedingMales;

    if (totalLayerBreedingFlock > 0) {
      const layerFeed = await db.feedStock.where('feedType').equals('layer_production').first();

      if (layerFeed && layerFeed.isActive !== false) {
        // Find existing layer consumption logs in the past 7 days to check for missing days
        const recentLayerLogs = await db.feedConsumption
          .where('feedType')
          .equals('layer_production')
          .and((r) => r.targetId === 'all-layers')
          .toArray();

        const loggedDates = new Set(recentLayerLogs.map((l) => l.date));

        // Determine days to check (today and up to 3 previous days if missing)
        const candidateDates: string[] = [];
        for (let i = 3; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          candidateDates.push(dateStr);
        }

        const missingLayerDates = candidateDates.filter((d) => !loggedDates.has(d));

        for (const targetDate of missingLayerDates) {
          // Re-fetch current layer feed stock
          const currentLayerFeed = await db.feedStock.where('feedType').equals('layer_production').first();
          if (!currentLayerFeed) break;

          const dailyKg = Math.round(((totalLayerBreedingFlock * 30) / 1000) * 100) / 100;
          if (currentLayerFeed.totalKg >= dailyKg) {
            const bagWeight = currentLayerFeed.bagWeightKg || 50;
            const costPerBag = currentLayerFeed.costPerBag || 0;
            const dailyCost = Math.round(dailyKg * (costPerBag / bagWeight));
            const dailyBags = Math.round((dailyKg / bagWeight) * 100) / 100;

            const newTotalKg = Math.max(0, Math.round((currentLayerFeed.totalKg - dailyKg) * 100) / 100);
            const newBags = Math.floor(newTotalKg / bagWeight);

            // Deduct stock
            await db.feedStock.update(currentLayerFeed.id, {
              totalKg: newTotalKg,
              bagsCount: newBags,
            });

            // Log consumption record
            await db.feedConsumption.add({
              id: `fc-auto-layers-${Date.now()}-${targetDate}`,
              date: targetDate,
              targetType: 'all',
              targetId: 'all-layers',
              targetName: `قطيع البياض والتخصيب (${totalLayerBreedingFlock.toLocaleString('ar-SA')} طائر: ${totalLayerFemales.toLocaleString('ar-SA')} إناث + ${totalBreedingMales.toLocaleString('ar-SA')} ذكور)`,
              feedType: 'layer_production',
              bagsUsed: dailyBags,
              kgUsed: dailyKg,
              costAmount: dailyCost,
              birdsCount: totalLayerBreedingFlock,
              notes: `خصم استهلاك يومي تلقائي لقطيع البياض والتخصيب (${totalLayerFemales} إناث + ${totalBreedingMales} ذكور) بمعدل 30 جم/طير عن يوم ${targetDate}`,
              recordedBy,
              createdAt: new Date().toISOString(),
            });

            totalLayerKg += dailyKg;
            totalLayerCost += dailyCost;
            datesProcessedSet.add(targetDate);
          }
        }
      }
    }

    // =========================================================================
    // PART 2: Automated Brooding Batches Feed Consumption (Progressive Scale)
    // =========================================================================
    const activeBroodingBatches = await db.broodingBatches
      .where('status')
      .equals('active')
      .toArray();

    for (const batch of activeBroodingBatches) {
      if (batch.currentChicksCount <= 0) continue;

      // Determine missing deduction dates for this batch
      const batchMissingDates: string[] = [];

      if (!batch.lastFeedDeductionDate) {
        batchMissingDates.push(todayStr);
      } else if (batch.lastFeedDeductionDate < todayStr) {
        // Catch up missing days between lastFeedDeductionDate and todayStr (up to 4 days max)
        const lastDate = new Date(batch.lastFeedDeductionDate);
        const todayDate = new Date(todayStr);
        const diffDays = Math.min(
          4,
          Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
        );

        for (let i = diffDays - 1; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dStr = d.toISOString().split('T')[0];
          if (dStr > batch.lastFeedDeductionDate) {
            batchMissingDates.push(dStr);
          }
        }
      }

      let batchProcessed = false;

      for (const targetDate of batchMissingDates) {
        // Prevent double recording if record already exists for this batch and date
        const existingRecord = await db.feedConsumption
          .where('date')
          .equals(targetDate)
          .and((r) => r.targetId === batch.id)
          .first();

        if (existingRecord) continue;

        // Calculate chick age on targetDate
        const hatchDateObj = new Date(batch.hatchDate);
        const targetDateObj = new Date(targetDate);
        const ageDays = Math.max(
          1,
          Math.floor((targetDateObj.getTime() - hatchDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1
        );

        const { grams } = getChickDailyConsumptionGrams(ageDays);
        const dailyKg = Math.round(((batch.currentChicksCount * grams) / 1000) * 100) / 100;

        const feedStock = await db.feedStock.where('feedType').equals(batch.selectedFeedType).first();

        if (feedStock && feedStock.totalKg >= dailyKg) {
          const bagWeight = feedStock.bagWeightKg || 50;
          const costPerBag = feedStock.costPerBag || 0;
          const dailyCost = Math.round(dailyKg * (costPerBag / bagWeight));
          const dailyBags = Math.round((dailyKg / bagWeight) * 100) / 100;

          const newTotalKg = Math.max(0, Math.round((feedStock.totalKg - dailyKg) * 100) / 100);
          const newBags = Math.floor(newTotalKg / bagWeight);

          // Update Feed Warehouse
          await db.feedStock.update(feedStock.id, {
            totalKg: newTotalKg,
            bagsCount: newBags,
          });

          const phaseLabel =
            ageDays <= 21
              ? 'المرحلة 1: تدفئة'
              : ageDays <= 38
              ? 'المرحلة 2: بطاريات تحضين'
              : 'مكتملة التحضين';

          // Add Feed Consumption Record
          await db.feedConsumption.add({
            id: `fc-auto-brood-${Date.now()}-${batch.id}-${targetDate}`,
            date: targetDate,
            targetType: 'room',
            targetId: batch.id,
            targetName: `دفعة تحضين (${batch.batchNumber}) - ${phaseLabel} (عمر ${ageDays} يوم)`,
            feedType: batch.selectedFeedType,
            bagsUsed: dailyBags,
            kgUsed: dailyKg,
            costAmount: dailyCost,
            birdsCount: batch.currentChicksCount,
            notes: `خصم آلي مجدول لاستهلاك صيصان التحضين (${batch.batchNumber}) بعمر ${ageDays} يوم بمعدل ${grams} جم/طير عن يوم ${targetDate}`,
            recordedBy,
            createdAt: new Date().toISOString(),
          });

          // Update batch tracking
          await db.broodingBatches.update(batch.id, {
            lastFeedDeductionDate: targetDate,
            totalFeedConsumedKg: (batch.totalFeedConsumedKg || 0) + dailyKg,
            updatedAt: new Date().toISOString(),
          });

          totalBroodingKg += dailyKg;
          totalBroodingCost += dailyCost;
          datesProcessedSet.add(targetDate);
          batchProcessed = true;
        }
      }

      if (batchProcessed) {
        broodingBatchesCount++;
      }
    }

    const datesProcessed = Array.from(datesProcessedSet).sort();
    const executed = totalLayerKg > 0 || totalBroodingKg > 0;

    let summaryMessage = '';
    if (executed) {
      const parts: string[] = [];
      if (totalLayerKg > 0) {
        parts.push(`علف البياض: ${totalLayerKg.toLocaleString('ar-SA')} كغم`);
      }
      if (totalBroodingKg > 0) {
        parts.push(`علف التحضين (${broodingBatchesCount} دفعات): ${totalBroodingKg.toLocaleString('ar-SA')} كغم`);
      }
      summaryMessage = `⚡ تم خصم استهلاك الأعلاف اليومي تلقائياً بنجاح (${parts.join(' | ')})`;
    } else {
      summaryMessage = 'جميع استهلاكات الأعلاف لليوم مسجلة ومخصومة مسبقاً.';
    }

    return {
      executed,
      layerKgDeducted: Math.round(totalLayerKg * 100) / 100,
      layerCostAmount: totalLayerCost,
      broodingKgDeducted: Math.round(totalBroodingKg * 100) / 100,
      broodingCostAmount: totalBroodingCost,
      broodingBatchesProcessed: broodingBatchesCount,
      datesProcessed,
      summaryMessage,
    };
  } catch (error) {
    console.error('Error in executeAutomatedDailyFeedDeduction:', error);
    return {
      executed: false,
      layerKgDeducted: 0,
      layerCostAmount: 0,
      broodingKgDeducted: 0,
      broodingCostAmount: 0,
      broodingBatchesProcessed: 0,
      datesProcessed: [],
      summaryMessage: 'حدث خطأ أثناء فحص الخصم الآلي للأعلاف.',
    };
  } finally {
    isRunningAutoDeduction = false;
  }
}
