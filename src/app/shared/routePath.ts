export class routePath {
    slase: string = '/';
// basic route
    home: string = 'home';
    about: string = 'about';
    contact: string = 'contact';
    forgotPassword: string = 'forgot-password';
    forgotPasswordOtp: string = 'forgot-password-otp/';
    resetPassword: string = 'reset-password/';
// user route
    login: string = 'login';
    signup: string = 'signup';
    profile: string = 'profile';
// task route
    addTask: string = 'add-task';
    displayTasks: string = 'display-tasks';
// server route
    // server_url: string = 'http://localhost:5700';
    server_url: string = 'https://a7-task-manager-server.herokuapp.com';
    // user route
        registerServer = '/user/register';
        loginServer = '/user/login';
        updateUserServer = '/user/update-user/';
        deleteUserServer = '/user/delete-user/';
        displayUserServer = '/user/display-user/'
        forgotPasswordServer = '/user/forgot-password';
    // task route
        addTaskServer = '/task/add-task';
        updateTaskServer = '/task/update-task/';
        deleterTaskServer = '/task/delete-task/';
        displayTasksServer = '/task/display-tasks/';
        displayTaskServer = '/task/display-task/';
    // email route
        getFeedbackServer = '/email/get-feedback';
        sendHotmailServer = '/email/send-hotmail';
        sendResetPasswordOtpEmailServer = '/email/send-reset-password-otp-email';
        sendPasswordUpdatedSuccessEmailServer= '/email/send-password-updated-success-email/';

}