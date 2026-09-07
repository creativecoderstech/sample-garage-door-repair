export const APPROVED_GARAGE_BUSINESS_NAME = "Cumming Garage Door Service";

export const GARAGE_EXAMPLE_DETAILS = {
  phone: "(470) 555-0147",
  email: "service@cumminggaragedoor.example",
  hours: "Monday–Friday 8am–6pm; Saturday 9am–2pm; Sunday closed",
  coverage: "Cumming and Forsyth County (provisional)",
} as const;

export type GarageClaimKey =
  | "businessName" | "phone" | "email" | "hours" | "coverage" | "urgentPolicy"
  | "ownerTeam" | "yearsInBusiness" | "brandsServiced" | "paymentOptions"
  | "financing" | "licenseInsurance" | "warranty";

export type GarageClaimVerification = {
  status: "unverified" | "verified";
  isExample: boolean;
  verifiedAt: string | null;
};

export type GarageClaimVerificationMap = Partial<Record<GarageClaimKey, GarageClaimVerification>>;

export type GarageProjectionInput = {
  businessName: string;
  phone: string;
  email: string;
  serviceArea: string;
  hours?: string;
  coverage?: string;
  urgentPolicy?: string;
  theme: string;
  emergencyEnabled: boolean;
  heroImage: string;
  galleryImages: string[];
  productionApproved?: boolean;
  domainConfigured?: boolean;
  authConfigured?: boolean;
  claimVerification?: GarageClaimVerificationMap;
  trustProfile: Record<string, string | null>;
};

export type GarageLaunchDependencies = {
  notificationConfigured: boolean;
  notificationDestinationVerified: boolean;
  notificationTested: boolean;
  runtimeReady?: boolean;
};

const reservedExampleValue = (key: GarageClaimKey, value: string) => {
  const normalized = value.trim().toLowerCase();
  if (key === "phone") return normalized.replace(/\D/g, "") === "4705550147" || /55501\d{2}$/.test(normalized.replace(/\D/g, ""));
  if (key === "email") return normalized.endsWith(".example") || normalized === GARAGE_EXAMPLE_DETAILS.email;
  return false;
};

const publishable = (input: GarageProjectionInput, key: GarageClaimKey, value: string | null | undefined) => {
  const claim = input.claimVerification?.[key];
  return Boolean(value?.trim() && claim?.status === "verified" && claim.isExample === false && !reservedExampleValue(key, value));
};

export function garageLaunchReadiness(
  input: GarageProjectionInput,
  dependencies: GarageLaunchDependencies = {
    notificationConfigured: false,
    notificationDestinationVerified: false,
    notificationTested: false,
  },
) {
  const checks = {
    productionApproved: input.productionApproved === true,
    approvedBusinessName: input.businessName.trim() === APPROVED_GARAGE_BUSINESS_NAME,
    realPhone: publishable(input, "phone", input.phone),
    realEmail: publishable(input, "email", input.email),
    verifiedHours: publishable(input, "hours", input.hours),
    verifiedCoverage: publishable(input, "coverage", input.coverage || input.serviceArea),
    notificationConfigured: dependencies.notificationConfigured,
    notificationDestinationVerified: dependencies.notificationDestinationVerified,
    notificationTested: dependencies.notificationTested,
    domainConfigured: input.domainConfigured === true && dependencies.runtimeReady === true,
    authConfigured: input.authConfigured === true && dependencies.runtimeReady === true,
  };
  const missing = Object.entries(checks).filter(([, ready]) => !ready).map(([key]) => key);
  return { launchReady: missing.length === 0, checks, missing };
}

export function projectGarageBusinessSettings(
  input: GarageProjectionInput,
  dependencies?: GarageLaunchDependencies,
) {
  const trustProfile = Object.fromEntries(Object.entries(input.trustProfile).map(([key, value]) => [
    key,
    publishable(input, key as GarageClaimKey, value) ? value : null,
  ]));
  const phone = publishable(input, "phone", input.phone) ? input.phone : "";
  const email = publishable(input, "email", input.email) ? input.email : "";
  const hours = publishable(input, "hours", input.hours) ? input.hours! : "";
  const coverageValue = input.coverage || input.serviceArea;
  const coverage = publishable(input, "coverage", coverageValue) ? coverageValue : "";
  const urgentPolicy = publishable(input, "urgentPolicy", input.urgentPolicy) ? input.urgentPolicy! : "";
  const readiness = garageLaunchReadiness(input, dependencies);
  return {
    businessName: APPROVED_GARAGE_BUSINESS_NAME,
    phone,
    email,
    serviceArea: coverage,
    hours,
    coverage,
    urgentPolicy,
    theme: input.theme,
    emergencyEnabled: Boolean(urgentPolicy && input.emergencyEnabled),
    heroImage: input.heroImage,
    galleryImages: input.galleryImages,
    verificationStatus: readiness.launchReady ? "verified" as const : "unverified" as const,
    trustProfile,
    launchReady: readiness.launchReady,
    launchChecks: readiness.checks,
    exampleDetails: {
      phone: input.claimVerification?.phone?.isExample ? input.phone : "",
      email: input.claimVerification?.email?.isExample ? input.email : "",
      hours: input.claimVerification?.hours?.isExample ? input.hours || "" : "",
      coverage: input.claimVerification?.coverage?.isExample ? coverageValue : "",
      visiblyUnverified: true as const,
      label: "Temporary examples — not verified and not used for contact actions",
    },
  };
}