import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Cron, CronExpression, SchedulerRegistry } from "@nestjs/schedule";
import { Model } from "mongoose";
import { NotificationDocument } from "src/models/Notifications.schema";

@Injectable()
export class NotifCleanupTask {
    constructor(
        // ...
        private schedulerRegistry: SchedulerRegistry,
        @InjectModel("Notification") private readonly NotificationModel: Model<NotificationDocument>,
    ) {}

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { name: "notifCleanup", timeZone: "Asia/Tehran" })
    async job(): Promise<string | void> {
        // deletes any notifs that creation data passes 6 month
        await this.NotificationModel.deleteMany({ createdAt: { $lt: new Date(Date.now() - 3_600_000 * 24 * 180) } }).exec();
    }
}
