import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Cron, CronExpression, SchedulerRegistry } from "@nestjs/schedule";
import { readFile } from "fs/promises";
import { Model } from "mongoose";
import { Brand } from "src/models/Brands.schema";
import { User } from "src/models/Users.schema";
import { Input } from "src/services/notifs.service";
import Email from "src/notifications/channels/Email";
import {
    BillReminderData,
    BrandUsernameChangeData,
    InviteUpdateData,
    NewBillData,
    NewInviteData,
    NewTransactionData,
    Notification,
    NotificationDocument,
    WelcomeNewUserData,
} from "src/models/Notifications.schema";
import { BillDocument } from "src/models/Bills.schema";
import { Plan } from "src/models/Plans.schema";
import { TransactionDocument } from "src/models/Transactions.schema";

interface BaseEmailInput {
    notifID: string;
    emailAddress: string;
    lang: string;
}

interface BillReminder_Input extends BaseEmailInput, BillReminderData {}
interface NewBill_Input extends BaseEmailInput, NewBillData {}
interface NewTransaction_Input extends BaseEmailInput, NewTransactionData {}
interface NewInvite_Input extends BaseEmailInput, NewInviteData {}
interface InviteUpdate_Input extends BaseEmailInput, InviteUpdateData {}
interface WelcomeNewUser_Input extends BaseEmailInput, WelcomeNewUserData {}
interface BrandUsernameChange_Input extends BaseEmailInput, BrandUsernameChangeData {}

export type EmailInput =
    | BillReminder_Input
    | NewBill_Input
    | NewTransaction_Input
    | NewInvite_Input
    | InviteUpdate_Input
    | WelcomeNewUser_Input
    | BrandUsernameChange_Input;

@Injectable()
export class NotifSenderTask {
    constructor(
        // ...
        private schedulerRegistry: SchedulerRegistry,
        @InjectModel("Notification") private readonly NotificationModel: Model<NotificationDocument>,
        @InjectModel("Bill") private readonly BillModel: Model<BillDocument>,
        @InjectModel("Transaction") private readonly TransactionModel: Model<TransactionDocument>,
    ) {}

    @Cron(CronExpression.EVERY_5_MINUTES, { name: "notifSender", timeZone: "Asia/Tehran" })
    async job(): Promise<string | void> {
        // TODO
        // check if user allows email notif for that particle notif
        // if user does not allow then make sendAsEmail to false

        const notifs = await this.NotificationModel.find({
            sendAsEmail: true,
            $or: [{ emailSentAt: null }, { emailSentAt: { $exists: false } }],
            createdAt: { $gte: new Date(Date.now() - 3_600_000 * 12) },
        })
            .populate<{ user: User }>("user", "email")
            .populate<{ brand: Brand & { creator: User } }>({ path: "brand", populate: { path: "creator" } })
            .limit(500)
            .exec();

        for (let i = 0; i < notifs.length; i++) {
            const notif = notifs[i];

            let email = "";
            if (notif.type == "new-invite" || notif.type == "welcome-new-user") email = notif.user?.email || "";
            else email = notif.brand?.creator?.email || "";

            this._email({ notifID: notif._id, emailAddress: email, lang: notif.lang || "fa", type: notif.type, data: notif.data }).catch((e) => console.log({ e }));
        }
    }

    private async _email({ notifID, emailAddress, lang, type, data }: EmailInput): Promise<void> {
        let emailTemplate = "";
        let title = "";
        const vals: { k: string; v: string }[] = [{ k: "url", v: process.env.FRONT_URL }];

        switch (type) {
            case "welcome-new-user":
                emailTemplate = "welcomeEmail";
                title = lang == "fa" ? "به منوریوم خوش اومدی" : "Welcome To Menuriom";
                vals.push(...(await this._getValsDataFor_welcomeNewUser({ emailAddress, notifID, lang, type, data })));
                break;
            case "brand-username-change":
                emailTemplate = "usernameChangeEmail";
                title = lang == "fa" ? "تغییر نام کاربری برند" : "Brand Username Has Been Changed";
                vals.push(...(await this._getValsDataFor_brandUsernameChange({ emailAddress, notifID, lang, type, data })));
                break;
            case "new-invite":
                emailTemplate = "newInviteEmail";
                title = lang == "fa" ? "دعوت نامه جدید" : "New Invite";
                vals.push(...(await this._getValsDataFor_newInvite({ emailAddress, notifID, lang, type, data })));
                break;
            case "invite-update":
                emailTemplate = "inviteUpdateEmail";
                title = lang == "fa" ? "پاسخ دعوت نامه ارسالی" : "Sent Invite Update";
                vals.push(...(await this._getValsDataFor_inviteUpdate({ emailAddress, notifID, lang, type, data })));
                break;
            case "new-bill":
                emailTemplate = "newBillEmail";
                title = lang == "fa" ? `صورتحساب جدید با شماره ${data.billNumber}` : `New Bill With Code ${data.billNumber}`;
                vals.push(...(await this._getValsDataFor_newBill({ emailAddress, notifID, lang, type, data })));
                break;
            case "bill-reminder":
                emailTemplate = "billReminderEmail";
                title = lang == "fa" ? "یادآوری پرداخت صورتحساب" : "Bill Payment Reminder";
                vals.push(...(await this._getValsDataFor_billReminder({ emailAddress, notifID, lang, type, data })));
                break;
            case "new-transaction":
                emailTemplate = "billTransactionEmail";
                title = lang == "fa" ? "تراکنش پرداخت صورتحساب" : "New Payment Transaction";
                vals.push(...(await this._getValsDataFor_newTransaction({ emailAddress, notifID, lang, type, data })));
                break;
        }

        if (!emailTemplate || !title) return;

        let html = await readFile(`./src/notifications/templates/${lang}/${emailTemplate}.html`).then((buffer) => buffer.toString());
        vals.forEach((val) => {
            html = html.replace(new RegExp(`{{${val.k}}}`, "g"), val.v);
        });

        await Email(title, emailAddress, html)
            .then(async () => await this.NotificationModel.updateOne({ _id: notifID }, { emailSentAt: new Date(Date.now()) }).exec())
            .catch((e) => console.log(e));
    }

    private async _getValsDataFor_welcomeNewUser({ lang, type, data }: EmailInput): Promise<{ k: string; v: string }[]> {
        return [];
    }

    private async _getValsDataFor_brandUsernameChange({ lang, type, data }: EmailInput): Promise<{ k: string; v: string }[]> {
        if (type != "brand-username-change") return [];

        return [{ k: "brandUsername", v: data.newUsername || "" }];
    }

    private async _getValsDataFor_newInvite({ lang, type, data }: EmailInput): Promise<{ k: string; v: string }[]> {
        if (type != "new-invite") return [];

        return [
            { k: "brandName", v: data.brandName || "" },
            { k: "roleName", v: data.roleName || "" },
        ];
    }

    private async _getValsDataFor_inviteUpdate({ lang, type, data }: EmailInput): Promise<{ k: string; v: string }[]> {
        if (type != "invite-update") return [];

        const accepted = lang == "fa" ? "تایید شد" : "got accepted";
        const rejected = lang == "fa" ? "رد شد" : "got rejected";

        return [
            { k: "userEmail", v: data.userEmail || "" },
            { k: "backgroundColor", v: data.status == "accepted" ? "#bbf7d0" : "#fecaca" },
            { k: "color", v: data.status == "accepted" ? "#15803d" : "#b91c1c" },
            { k: "status", v: data.status == "accepted" ? accepted : rejected },
            { k: "img", v: data.status == "accepted" ? "img6.png" : "img5.png" },
        ];
    }

    private async _getValsDataFor_newBill({ lang, type, data }: EmailInput): Promise<{ k: string; v: string }[]> {
        if (type != "new-bill") return [];

        const renewal = lang == "fa" ? "تمدید" : "Renewal";
        const change = lang == "fa" ? "تغییر" : "Change";
        const monthly = lang == "fa" ? "ماهانه" : "monthly";
        const yearly = lang == "fa" ? "سالانه" : "yearly";

        const bill = await this.BillModel.findOne({ _id: data.billID })
            .populate<{ plan: Plan }>("plan", "icon name desc monthlyPrice yearlyPrice translation")
            .exec();
        if (!bill) return [];

        return [
            { k: "type", v: data.type == "planChange" ? change : renewal },
            { k: "description", v: bill.translation?.[lang]?.description || bill.description },
            { k: "billNumber", v: `#${bill.billNumber}` },
            { k: "issueDate", v: bill.createdAt.toLocaleString(lang) },
            { k: "payablePrice", v: `${Intl.NumberFormat(lang).format(bill.payablePrice)} تومان` },
            { k: "planIcon", v: bill.plan.icon },
            { k: "planName", v: bill.plan.translation?.[lang]?.name || bill.plan.name },
            { k: "planPeriod", v: bill.planPeriod == "monthly" ? monthly : yearly },
        ];
    }

    private async _getValsDataFor_billReminder({ lang, type, data }: EmailInput): Promise<{ k: string; v: string }[]> {
        if (type != "bill-reminder") return [];

        const renewal = lang == "fa" ? "تمدید" : "Renewal";
        const change = lang == "fa" ? "تغییر" : "Change";
        const monthly = lang == "fa" ? "ماهانه" : "monthly";
        const yearly = lang == "fa" ? "سالانه" : "yearly";

        const bill = await this.BillModel.findOne({ _id: data.billID })
            .populate<{ plan: Plan }>("plan", "icon name desc monthlyPrice yearlyPrice translation")
            .exec();
        if (!bill) return [];

        return [
            { k: "type", v: data.type == "planChange" ? change : renewal },
            { k: "description", v: bill.translation?.[lang]?.description || bill.description },
            { k: "billNumber", v: `#${bill.billNumber}` },
            { k: "issueDate", v: bill.createdAt.toLocaleString(lang) },
            { k: "payablePrice", v: `${Intl.NumberFormat(lang).format(bill.payablePrice)} تومان` },
            { k: "planIcon", v: bill.plan.icon },
            { k: "planName", v: bill.plan.translation?.[lang]?.name || bill.plan.name },
            { k: "planPeriod", v: bill.planPeriod == "monthly" ? monthly : yearly },
        ];
    }

    private async _getValsDataFor_newTransaction({ lang, type, data }: EmailInput): Promise<{ k: string; v: string }[]> {
        if (type != "new-transaction") return [];

        const renewal = lang == "fa" ? "تمدید" : "Renewal";
        const change = lang == "fa" ? "تغییر" : "Change";
        const monthly = lang == "fa" ? "ماهانه" : "monthly";
        const yearly = lang == "fa" ? "سالانه" : "yearly";

        const bill = await this.BillModel.findOne({ _id: data.billID })
            .populate<{ plan: Plan }>("plan", "icon name desc monthlyPrice yearlyPrice translation")
            .exec();
        if (!bill) return [];

        const transaction = await this.TransactionModel.findOne({ _id: data.transactionID }).exec();
        if (!transaction) return [];

        return [
            { k: "type", v: bill.type == "planChange" ? change : renewal },
            { k: "description", v: bill.translation?.[lang]?.description || bill.description },
            { k: "billNumber", v: `#${bill.billNumber}` },
            { k: "issueDate", v: bill.createdAt.toLocaleString(lang) },
            { k: "payablePrice", v: `${Intl.NumberFormat(lang).format(bill.payablePrice)} تومان` },
            { k: "planIcon", v: bill.plan.icon },
            { k: "planName", v: bill.plan.translation?.[lang]?.name || bill.plan.name },
            { k: "planPeriod", v: bill.planPeriod == "monthly" ? monthly : yearly },

            { k: "paidPrice", v: `${Intl.NumberFormat(lang).format(transaction.paidPrice)} تومان` },
            { k: "date", v: transaction.createdAt.toLocaleString(lang) },
            { k: "transactionCode", v: transaction.code || "---" },
        ];
    }
}
