export class SubscriptionModel {
    _id: string;
    userId: string;
    endpoint: string;
    auth: string;
    p256dh: string;
    allowNotification: boolean;
    createdAt: string;
    updatedAt: string;
}