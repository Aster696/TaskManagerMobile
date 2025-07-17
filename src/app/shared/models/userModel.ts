export class UserModel {
    _id: string;
    avatar: string;
    userName: string;
    email: string;
    password: string;
    rememberMe: boolean;
    tasks: [];
    notification: [];
    subscribeToNotification: [];
    allowNotification: boolean;
    emailNotification: boolean;
    authority: string;
    status: boolean;
    deleteAc: boolean;
    createdAt: string;
    updatedAt: string;
    // other
    otp: string;
    subject: string;
    message: string;
    typeOfEmail: string;
}