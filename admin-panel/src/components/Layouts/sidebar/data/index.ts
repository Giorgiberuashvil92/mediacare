import * as Icons from "../icons";

export const NAV_DATA = [
  {
    label: "MEDICARE ADMIN",
    items: [
      {
        title: "Dashboard",
        icon: Icons.HomeIcon,
        items: [
          {
            title: "Overview",
            url: "/",
          },
        ],
      },
      {
        title: "Users",
        url: "/users",
        icon: Icons.User,
        items: [],
      },
      {
        title: "Doctors",
        url: "/doctors",
        icon: Icons.User,
        items: [],
      },
      {
        title: "Appointments",
        url: "/appointments",
        icon: Icons.Calendar,
        items: [],
      },
      {
        title: "Specializations",
        url: "/specializations",
        icon: Icons.FourCircle,
        items: [],
      },
      {
        title: "მრჩეველები",
        url: "/advisors",
        icon: Icons.User,
        items: [],
      },
      {
        title: "Medicine Shop",
        url: "/medicine-shop",
        icon: Icons.FourCircle,
        items: [],
      },
      {
        title: "ტერმინები",
        url: "/terms",
        icon: Icons.DocumentText,
        items: [],
      },
      {
        title: "დახმარების ცენტრი",
        url: "/help-center",
        icon: Icons.DocumentText,
        items: [],
      },
      {
        title: "Settings",
        url: "/settings",
        icon: Icons.Alphabet,
        items: [],
      },
    ],
  },
  // ზედმეტი სექციები დამალულია
  // {
  //   label: "OTHERS",
  //   items: [
  //     {
  //       title: "Charts",
  //       icon: Icons.PieChart,
  //       items: [
  //         {
  //           title: "Basic Chart",
  //           url: "/charts/basic-chart",
  //         },
  //       ],
  //     },
  //     {
  //       title: "UI Elements",
  //       icon: Icons.FourCircle,
  //       items: [
  //         {
  //           title: "Alerts",
  //           url: "/ui-elements/alerts",
  //         },
  //         {
  //           title: "Buttons",
  //           url: "/ui-elements/buttons",
  //         },
  //       ],
  //     },
  //     {
  //       title: "Authentication",
  //       icon: Icons.Authentication,
  //       items: [
  //         {
  //           title: "Sign In",
  //           url: "/auth/sign-in",
  //         },
  //       ],
  //     },
  //   ],
  // },
];
