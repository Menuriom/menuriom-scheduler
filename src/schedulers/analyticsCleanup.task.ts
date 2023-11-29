import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Cron, CronExpression, SchedulerRegistry } from "@nestjs/schedule";
import { Model } from "mongoose";
import { AnalyticDocument } from "src/models/Analytics.schema";

@Injectable()
export class AnalyticsCleanupTask {
    constructor(
        // ...
        private schedulerRegistry: SchedulerRegistry,
        @InjectModel("Analytic") private readonly AnalyticModel: Model<AnalyticDocument>,
    ) {}

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { name: "analyticsCleanup", timeZone: "Asia/Tehran" })
    async job(): Promise<string | void> {
        // delete any record that created date is passed 2 years
        await this.AnalyticModel.deleteMany({ createdAt: { $lt: new Date(Date.now() - 3_600_000 * 24 * 365 * 2) } }).exec();
    }
}
