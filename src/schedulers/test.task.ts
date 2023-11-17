import { Injectable } from "@nestjs/common";
import { Cron, CronExpression, SchedulerRegistry } from "@nestjs/schedule";

@Injectable()
export class TestTask {
    constructor(private schedulerRegistry: SchedulerRegistry) {}

    @Cron(CronExpression.EVERY_MINUTE, { name: "test", timeZone: "Asia/Tehran" })
    async job(): Promise<string | void> {
        console.log(1);
    }
}
