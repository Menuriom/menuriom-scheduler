import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { FilterQuery, Model, Types } from "mongoose";
import { Cron, CronExpression, SchedulerRegistry } from "@nestjs/schedule";
import { UserDocument } from "src/models/Users.schema";
import { BrandsPlan, BrandsPlanDocument } from "src/models/BrandsPlans.schema";
import { PlanDocument } from "src/models/Plans.schema";
import { BillDocument } from "src/models/Bills.schema";
import { TransactionDocument } from "src/models/Transactions.schema";
import { BrandDocument } from "src/models/Brands.schema";

@Injectable()
export class FactorGeneratorTask {
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

    @Cron(CronExpression.EVERY_4_HOURS, { name: "factorGenerator", timeZone: "Asia/Tehran" })
    async job(): Promise<string | void> {
        // get all purchasable plans
        const purchasablePlans = await this.PlanModel.find({ name: { $ne: "پلن پایه" } })
            .select("_id monthlyPrice yearlyPrice")
            .exec();
        const planIds = purchasablePlans.map((plan) => plan._id);

        let grabbedRows = 0;
        let lastRecordID = null;

        do {
            const brandPlansRows = await this._getPlansRows(lastRecordID, planIds);
            lastRecordID = brandPlansRows.lastRecordID;

            for (const brandPlan of brandPlansRows.brandPlans) {
                // TODO
                // generate a bill for them
                console.log({ brandPlan: brandPlan._id });
            }
        } while (grabbedRows >= this.rowPerOps);
    }

    private async _getPlansRows(lastRecordID: string, planIds: string[]): Promise<{ lastRecordID: string; brandPlans: BrandsPlan[] }> {
        let matchQuery: FilterQuery<any> = {
            currentPlan: { $in: planIds },
            nextInvoice: { $lte: new Date(new Date().getTime() + this.timeLimitForBillGeneration * 1000) },
        };
        if (lastRecordID) matchQuery = { _id: { $lt: new Types.ObjectId(lastRecordID) }, ...matchQuery };

        let agg = this.BrandsPlanModel.aggregate();
        agg.match(matchQuery);
        agg.lookup({
            from: "bills",
            let: { brandId: "$brand" },
            pipeline: [
                // ...
                { $match: { $expr: { $eq: ["$_id", "$$brandId"] }, type: "renewal", status: { $ne: "paid" } } },
                { $sort: { createdAt: -1 } },
                { $limit: 1 },
            ],
            as: "unpaidRenewalBill",
        });
        agg.match({ unpaidRenewalBill: { $eq: [] } });
        agg.project({ _id: 1, currentPlan: 1, period: 1, startTime: 1, nextInvoice: 1, createdAt: 1 });
        agg.limit(this.rowPerOps);

        let result: BrandsPlan[] | void = await agg.exec().catch((e) => console.log({ e }));
        if (!result) result = [];

        return { lastRecordID: "", brandPlans: result };
    }
}
