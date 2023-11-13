import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { FilterQuery, Model, Types } from "mongoose";
import { Cron, CronExpression, SchedulerRegistry } from "@nestjs/schedule";
import { UserDocument } from "src/models/Users.schema";
import { BrandsPlan, BrandsPlanDocument } from "src/models/BrandsPlans.schema";
import { Plan, PlanDocument } from "src/models/Plans.schema";
import { BillDocument } from "src/models/Bills.schema";
import { TransactionDocument } from "src/models/Transactions.schema";
import { BrandDocument } from "src/models/Brands.schema";

@Injectable()
export class RenewalBillCheckTask {
    constructor(
        // ...
        private schedulerRegistry: SchedulerRegistry,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("BrandsPlan") private readonly BrandsPlanModel: Model<BrandsPlanDocument>,
        @InjectModel("Plan") private readonly PlanModel: Model<PlanDocument>,
        @InjectModel("Bill") private readonly BillModel: Model<BillDocument>,
        @InjectModel("Transaction") private readonly TransactionModel: Model<TransactionDocument>,
    ) {}

    private rowPerOps = 1000;
    private timeLimitForBillGeneration = 60 * 60 * 24 * 7; // 7 days OR 1 week -> in seconds

    @Cron(CronExpression.EVERY_4_HOURS, { name: "renewalBillCheck", timeZone: "Asia/Tehran" })
    async job(): Promise<string | void> {
        // TODO
        // if any brandPlan invoice time passes the current time, then that brand should be locked to do anything until they pay up or convert to basic plan

        // a switch should be put in brand document so that we can lock the brand
        // locking brand mean any request to do any action for creating new things will be denied until the brand lock lifted by payment
    }
}
