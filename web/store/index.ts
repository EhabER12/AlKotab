import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";

import reviewReducer from "./slices/reviewSlice";
import paymentReducer from "./slices/paymentSlice";
import settingsReducer from "./slices/settingsSlice";
import userManagementReducer from "./slices/userSlice";
import formReducer from "./slices/formSlice";
import articleReducer from "./slices/articleSlice";
import serviceReducer from "./slices/serviceSlice";
import categoryReducer from "./slices/categorySlice";
import productReducer from "./slices/productSlice";
import cartReducer from "./slices/cartSlice";
import staticPageReducer from "./slices/staticPageSlice";
import aiArticleSettingsReducer from "./slices/aiArticleSettingsSlice";
import employeeReducer from "./slices/employeeSlice";
import courseReducer from "./slices/courseSlice";
import studentMemberReducer from "./slices/studentMemberSlice";
import certificateReducer from "./slices/certificateSlice";
import quizReducer from "./slices/quizSlice";
import sectionReducer from "./slices/sectionSlice";
import progressReducer from "./slices/progressSlice";
import packageReducer from "./slices/packageSlice";
import teacherGroupReducer from "./slices/teacherGroupSlice";
import emailTemplateReducer from "./slices/emailTemplateSlice";
import whatsappTemplateReducer from "./slices/whatsappTemplateSlice";
import notificationReducer from "./slices/notificationSlice";
import teacherProfitReducer from "./slices/teacherProfitSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    reviews: reviewReducer,
    payments: paymentReducer,
    settings: settingsReducer,
    userManagement: userManagementReducer,
    forms: formReducer,
    articles: articleReducer,
    services: serviceReducer,
    categories: categoryReducer,
    products: productReducer,
    cart: cartReducer,
    staticPages: staticPageReducer,
    aiArticleSettings: aiArticleSettingsReducer,
    employees: employeeReducer,
    courses: courseReducer,
    studentMembers: studentMemberReducer,
    certificates: certificateReducer,
    quizzes: quizReducer,
    sections: sectionReducer,
    progress: progressReducer,
    packages: packageReducer,
    teacherGroups: teacherGroupReducer,
    emailTemplates: emailTemplateReducer,
    whatsappTemplates: whatsappTemplateReducer,
    notifications: notificationReducer,
    teacherProfit: teacherProfitReducer,
  },
  devTools: process.env.NODE_ENV !== "production",
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
