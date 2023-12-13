import { Injectable } from "@nestjs/common";
import { Cron, CronExpression, SchedulerRegistry } from "@nestjs/schedule";

@Injectable()
export class BillReminderTask {
    constructor(
        // ...
        private schedulerRegistry: SchedulerRegistry,
    ) {}

    @Cron(CronExpression.EVERY_MINUTE, { name: "billReminder", timeZone: "Asia/Tehran" })
    async job(): Promise<string | void> {
        // TODO
        // reminds user to pay unpaid renewal bills
        // get bills that 1 day - 0 day remained to payment and also 2 day passed payment
    }
}
