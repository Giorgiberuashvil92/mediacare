import * as Icons from "../icons";

export const NAV_DATA = [
  {
    label: "MEDICARE ADMIN",
    items: [
      {
        title: "მთავარი",
        icon: Icons.HomeIcon,
        items: [
          {
            title: "Overview",
            url: "/",
          },
        ],
      },
      {
        title: "მომხმარებლები",
        url: "/users",
        icon: Icons.User,
        items: [],
      },
      {
        title: "ექიმები",
        url: "/doctors",
        icon: Icons.User,
        items: [],
      },
      {
        title: "ჯავშნები",
        url: "/appointments",
        icon: Icons.Calendar,
        items: [],
      },
      {
        title: "სპეციალიზაციები",
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
        title: "ლაბორატორია",
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
        title: "შეტყობინებები",
        url: "/notifications",
        icon: Icons.BellIcon,
        items: [],
      },
      {
        title: "პარამეტრები",
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
