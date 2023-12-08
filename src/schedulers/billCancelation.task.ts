import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Cron, CronExpression, SchedulerRegistry } from "@nestjs/schedule";
import { Model } from "mongoose";
import { SessionDocument } from "src/models/Sessions.schema";

@Injectable()
export class BillCancelationTask {
    constructor(
        // ...
        private schedulerRegistry: SchedulerRegistry,
        @InjectModel("Session") private readonly SessionModel: Model<SessionDocument>,
    ) {}

    @Cron(CronExpression.EVERY_5_MINUTES, { name: "billCancelation", timeZone: "Asia/Tehran" })
    async job(): Promise<string | void> {
        // change status of 'planChange' bills that are 'notPaid' or 'pendingPayment' and 15 minutes passed their createdAt
        await this.SessionModel.updateMany(
            { type: "planChange", status: { $in: ["notPaid", "pendingPayment"] }, createdAt: { $lt: new Date(Date.now() - 60 * 15 * 1000) } },
            { status: "canceled" },
            { limit: 500 },
        )
            .exec()
            .catch((e) => console.log({ e }));
    }
}
