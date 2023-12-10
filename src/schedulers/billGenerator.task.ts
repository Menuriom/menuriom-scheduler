import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { FilterQuery, Model, Types } from "mongoose";
import { Cron, CronExpression, SchedulerRegistry } from "@nestjs/schedule";
import { UserDocument } from "src/models/Users.schema";
import { BrandsPlan, BrandsPlanDocument } from "src/models/BrandsPlans.schema";
import { Plan, PlanDocument } from "src/models/Plans.schema";
import { BillDocument } from "src/models/Bills.schema";
import { TransactionDocument } from "src/models/Transactions.schema";
import { NotifsService } from "src/services/notifs.service";

@Injectable()
export class BillGeneratorTask {
    constructor(
        // ...
        private schedulerRegistry: SchedulerRegistry,
        private readonly notifsService: NotifsService,
        @InjectModel("User") private readonly UserModel: Model<UserDocument>,
        @InjectModel("BrandsPlan") private readonly BrandsPlanModel: Model<BrandsPlanDocument>,
        @InjectModel("Plan") private readonly PlanModel: Model<PlanDocument>,
        @InjectModel("Bill") private readonly BillModel: Model<BillDocument>,
        @InjectModel("Transaction") private readonly TransactionModel: Model<TransactionDocument>,
    ) {}

    private rowPerOps = 1000;
    private timeLimitForBillGeneration = 60 * 60 * 24 * 4; // 4 days -> in seconds

    @Cron(CronExpression.EVERY_6_HOURS, { name: "billGenerator", timeZone: "Asia/Tehran" })
    async job(): Promise<string | void> {
        const purchasablePlans = await this.PlanModel.find({ name: { $ne: "پلن پایه" } })
            .select("_id name monthlyPrice yearlyPrice translation")
            .exec();
        const planIds = purchasablePlans.map((plan) => plan._id);

        let grabbedRows = 0;
        let lastRecordID = null;

        do {
            const brandPlansRows = await this._getPlansRows(lastRecordID, planIds);
            lastRecordID = brandPlansRows.lastRecordID;

            for (const brandPlan of brandPlansRows.brandPlans) {
                await this._generateBill(brandPlan, purchasablePlans);
            }
        } while (grabbedRows >= this.rowPerOps);
    }

    private async _getPlansRows(lastRecordID: string, planIds: string[]): Promise<{ lastRecordID: string; brandPlans: BrandsPlan[] }> {
        let matchQuery: FilterQuery<any> = {
            currentPlan: { $in: planIds },
            nextInvoice: { $lte: new Date(Date.now() + this.timeLimitForBillGeneration * 1000) },
        };
        if (lastRecordID) matchQuery = { _id: { $lt: new Types.ObjectId(lastRecordID) }, ...matchQuery };

        let agg = this.BrandsPlanModel.aggregate();
        agg.match(matchQuery);
        agg.lookup({
            from: "bills",
            let: { brandId: "$brand" },
            pipeline: [
                {
                    $match: {
                        $expr: { $eq: ["$brand", "$$brandId"] },
                        type: "renewal",
                        $and: [{ status: { $ne: "paid" } }, { status: { $ne: "canceled" } }],
                    },
                },
                { $limit: 1 },
            ],
            as: "unpaidRenewalBill",
        });
        agg.match({ unpaidRenewalBill: { $eq: [] } });
        agg.project({ _id: 1, currentPlan: 1, brand: 1, period: 1, startTime: 1, nextInvoice: 1, createdAt: 1, unpaidRenewalBill: 1 });
        agg.limit(this.rowPerOps);

        let result: BrandsPlan[] | void = await agg.exec().catch((e) => console.log({ e }));
        if (!result) result = [];

        return { lastRecordID: "", brandPlans: result };
    }

    private async _generateBill(brandPlan: BrandsPlan, purchasablePlans: Plan[]) {
        let plan_fa = "";
        let plan_en = "";
        let payablePrice = 0;
        for (const plan of purchasablePlans) {
            if (plan._id.equals(brandPlan.currentPlan._id)) {
                plan_fa = plan.translation?.["fa"]?.name || plan.name;
                plan_en = plan.translation?.["en"]?.name || plan.name;
                payablePrice = plan[`${brandPlan.period}Price`] || 200_000;
            }
        }

        const description_fa = `تمدید اشتراک ${plan_fa}`;
        const description_en = `Plan renewal of ${plan_en}`;
        const devider = brandPlan.period === "monthly" ? 30 : 365;

        const bill = await this.BillModel.create({
            billNumber: await this._generateBillNumber(),
            type: "renewal",
            description: description_fa,
            // creator: req.session.userID,
            brand: brandPlan.brand,
            plan: brandPlan.currentPlan,
            planPeriod: brandPlan.period,
            payablePrice: payablePrice,
            status: "notPaid",
            secondsAddedToInvoice: devider * 24 * 60 * 60,
            createdAt: new Date(Date.now()),
            translation: { en: { description: description_en }, fa: { description: description_fa } },
        }).catch((e) => {
            console.log({ e });
        });

        if (bill) {
            await this.notifsService.notif({ brand: brandPlan.brand.toString(), type: "new-bill", data: { bill: bill.id }, sendAsEmail: true, showInSys: true });
        }
    }

    private async _generateBillNumber(): Promise<number> {
        let billNumberExists: boolean = true;
        let billNumber: number = 0;

        while (billNumberExists) {
            billNumber = Math.floor(100000000 + Math.random() * 900000000);
            billNumberExists = (await this.BillModel.exists({ billNumber: billNumber }).exec()) ? true : false;
        }

        return billNumber;
    }
}
