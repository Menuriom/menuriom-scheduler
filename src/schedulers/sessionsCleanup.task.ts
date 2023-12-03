import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Cron, CronExpression, SchedulerRegistry } from "@nestjs/schedule";
import { Model } from "mongoose";
import { SessionDocument } from "src/models/Sessions.schema";

@Injectable()
export class SessionsCleanupTask {
    constructor(
        // ...
        private schedulerRegistry: SchedulerRegistry,
        @InjectModel("Session") private readonly SessionModel: Model<SessionDocument>,
    ) {}

    @Cron(CronExpression.EVERY_2_HOURS, { name: "sessionsCleanup", timeZone: "Asia/Tehran" })
    async job(): Promise<string | void> {
        // delete any record that expire date is passed 60 days
        await this.SessionModel.deleteMany({
            status: { $ne: "active" },
            expireAt: { $lt: new Date(Date.now() - 3_600_000 * 24 * 60) },
        })
            .limit(500)
            .exec()
            .catch((e) => console.log({ e }));
    }
}
