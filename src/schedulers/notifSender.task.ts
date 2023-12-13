import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Cron, CronExpression, SchedulerRegistry } from "@nestjs/schedule";
import { readFile } from "fs/promises";
import { Model } from "mongoose";
import { Brand } from "src/models/Brands.schema";
import { Notification, NotificationDocument } from "src/models/Notifications.schema";
import { User } from "src/models/Users.schema";
import Email from "src/notifications/channels/Email";

@Injectable()
export class NotifSenderTask {
    constructor(
        // ...
        private schedulerRegistry: SchedulerRegistry,
        @InjectModel("Notification") private readonly NotificationModel: Model<NotificationDocument>,
    ) {}

    // @Cron(CronExpression.EVERY_5_MINUTES, { name: "notifSender", timeZone: "Asia/Tehran" })
    @Cron(CronExpression.EVERY_10_SECONDS, { name: "notifSender", timeZone: "Asia/Tehran" })
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

            this._email(notif._id.toString(), email, notif.lang, notif.type, notif.data)
                .then(() => {})
                .catch((e) => console.log({ e }));
        }
    }

    private async _email_test(emailAddress: string): Promise<void> {
        const randomTime = Math.random() * 10000;
        return new Promise((res, rej) => {
            setTimeout(() => res(), randomTime);
            setTimeout(() => rej("e"), 3000);
        });
    }

    private async _email(notifID: string, emailAddress: string, lang: string, emailType: Notification["type"], data: any): Promise<void> {
        let emailTemplate = "";
        let title = "";
        const vals: { k: string; v: string }[] = [];

        // TODO
        // for every type of notif create a template and test it

        switch (emailType) {
            case "welcome-new-user":
                emailTemplate = "welcome-new-user";
                title = lang == "fa" ? "به منوریوم خوش اومدی" : "Welcome To Menuriom";
                vals.push({ k: "", v: "" });
                break;
            case "brand-username-change":
                emailTemplate = "brand-username-change";
                title = lang == "fa" ? "تغییر نام کاربری برند" : "Brand Username Has Been Changed";
                vals.push({ k: "", v: "" });
                break;
            case "new-invite":
                emailTemplate = "new-invite";
                title = lang == "fa" ? "دعوت نامه جدید" : "New Invite";
                vals.push({ k: "", v: "" });
                break;
            case "invite-update":
                emailTemplate = "invite-update";
                title = lang == "fa" ? "پاسخ دعوت نامه ارسالی" : "Sent Invite Update";
                vals.push({ k: "", v: "" });
                break;
            case "new-bill":
                emailTemplate = "new-bill";
                title = lang == "fa" ? `صورتحساب جدید با شماره ${data.billNumber}` : `New Bill With Code ${data.billNumber}`;
                vals.push({ k: "", v: "" });
                break;
            case "bill-reminder":
                emailTemplate = "bill-reminder";
                title = lang == "fa" ? "یادآوری پرداخت صورتحساب" : "Bill Payment Reminder";
                vals.push({ k: "", v: "" });
                break;
            case "new-transaction":
                emailTemplate = "new-transaction";
                title = lang == "fa" ? "تراکنش پرداخت صورتحساب" : "New Payment Transaction";
                vals.push({ k: "", v: "" });
                break;
        }

        if (!emailTemplate || !title) return;

        let html = await readFile(`./src/notifications/templates/${lang}/${emailTemplate}.html`).then((buffer) => buffer.toString());
        vals.forEach((val) => {
            html = html.replace(`/{{${val.k}}}/g`, val.v);
        });

        await Email(title, emailAddress, html)
            .then(async () => await this.NotificationModel.updateOne({ _id: notifID }, { emailSentAt: new Date(Date.now()) }).exec())
            .catch((e) => console.log(e));
    }
}
