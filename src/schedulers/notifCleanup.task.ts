import { Injectable } from "@nestjs/common";
import { Cron, CronExpression, SchedulerRegistry } from "@nestjs/schedule";

@Injectable()
export class NotifCleanupTask {
    constructor(private schedulerRegistry: SchedulerRegistry) {}

    @Cron(CronExpression.EVERY_MINUTE, { name: "notifCleanup", timeZone: "Asia/Tehran" })
    async job(): Promise<string | void> {
        // TODO
        // deletes any notifs that creation data passes 6 month
    }
}
