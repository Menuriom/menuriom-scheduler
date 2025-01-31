import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ScheduleModule } from "@nestjs/schedule";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { AnalyticSchema } from "./models/Analytics.schema";
import { BrandsPlanSchema } from "./models/BrandsPlans.schema";
import { BrandSchema } from "./models/Brands.schema";
import { OrderSchema } from "./models/Orders.schema";
import { PlanLimitationSchema } from "./models/PlansLimitations.schema";
import { PlanSchema } from "./models/Plans.schema";
import { QrCodeSchema } from "./models/QrCodes.schema";
import { TransactionSchema } from "./models/Transactions.schema";
import { UserSchema } from "./models/Users.schema";
import { SessionSchema } from "./models/Sessions.schema";
import { UtknSchema } from "./models/Utkns.schema";
import { TestTask } from "./schedulers/test.task";
import { BillGeneratorTask } from "./schedulers/billGenerator.task";
import { BillSchema } from "./models/Bills.schema";
import { AnalyticsCleanupTask } from "./schedulers/analyticsCleanup.task";
import { SessionsCleanupTask } from "./schedulers/sessionsCleanup.task";
import { BillCancelationTask } from "./schedulers/billCancelation.task";
import { NotifsService } from "./services/notifs.service";
import { NotificationSchema } from "./models/Notifications.schema";
import { NotifCleanupTask } from "./schedulers/notifCleanup.task";
import { NotifSenderTask } from "./schedulers/notifSender.task";

@Module({
    imports: [
        ScheduleModule.forRoot(),
        ConfigModule.forRoot(),
        MongooseModule.forRoot(process.env.MONGO_URL, { dbName: process.env.MONGO_DB }),
        MongooseModule.forFeature([
            // ...
            { name: "Analytic", schema: AnalyticSchema },
            { name: "BrandsPlan", schema: BrandsPlanSchema },
            { name: "Brand", schema: BrandSchema },
            { name: "Order", schema: OrderSchema },
            { name: "PlanLimitation", schema: PlanLimitationSchema },
            { name: "Plan", schema: PlanSchema },
            { name: "Bill", schema: BillSchema },
            { name: "QrCode", schema: QrCodeSchema },
            { name: "Transaction", schema: TransactionSchema },
            { name: "User", schema: UserSchema },
            { name: "Session", schema: SessionSchema },
            { name: "Utkn", schema: UtknSchema },
            { name: "Notification", schema: NotificationSchema },
        ]),
    ],
    controllers: [AppController],
    providers: [
        // ...
        AppService,
        NotifsService,

        // Tasks...
        BillGeneratorTask,
        AnalyticsCleanupTask,
        SessionsCleanupTask,
        BillCancelationTask,
        NotifCleanupTask,
        NotifSenderTask,
        // TestTask
    ],
})
export class AppModule {}
