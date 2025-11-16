import { compactFormat } from "@/lib/format-number";
import { getOverviewData } from "../../fetch";
import { OverviewCard } from "./card";
import * as icons from "./icons";

export async function OverviewCardsGroup() {
  const { users, patients, doctors, pendingDoctors } = await getOverviewData();

  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4 2xl:gap-7.5">
      <OverviewCard
        label="მთლიანი მომხმარებლები"
        data={{
          ...users,
          value: compactFormat(users.value),
        }}
        Icon={icons.Users}
      />

      <OverviewCard
        label="პაციენტები"
        data={{
          ...patients,
          value: compactFormat(patients.value),
        }}
        Icon={icons.Product}
      />

      <OverviewCard
        label="ექიმები"
        data={{
          ...doctors,
          value: compactFormat(doctors.value),
        }}
        Icon={icons.Views}
      />

      <OverviewCard
        label="განხილვის მოლოდინში"
        data={{
          ...pendingDoctors,
          value: compactFormat(pendingDoctors.value),
        }}
        Icon={icons.Profit}
      />
    </div>
  );
}
