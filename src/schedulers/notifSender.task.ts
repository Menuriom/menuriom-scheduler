import { Injectable } from "@nestjs/common";
import { Cron, CronExpression, SchedulerRegistry } from "@nestjs/schedule";

@Injectable()
export class NotifSenderTask {
    constructor(private schedulerRegistry: SchedulerRegistry) {}

    @Cron(CronExpression.EVERY_MINUTE, { name: "notifSender", timeZone: "Asia/Tehran" })
    async job(): Promise<string | void> {
        // TODO
        // reads 500 notif records at a time that needs to send emails to
        // check if user allows email notif for that particle notif
        // sends the email
        // if user does not allow then make sendAsEmail to false

        // there might be some notifs that has user field but no brand field
        // we need to send tose emails to that user
    }
}
