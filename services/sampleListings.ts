import sampleListing from "../sample-listing.md?raw";
import cleanCondoListing from "../sample-clean-condo.md?raw";
import rentalListing from "../sample-rental.md?raw";
import { ListingType } from "../types";

export interface SampleListing {
  id: string;
  label: string;
  description: string;
  listingType: ListingType;
  content: string;
}

export const SAMPLE_LISTINGS: SampleListing[] = [
  {
    id: "risky-condo",
    label: "Risky condo",
    description: "Assessment, high fees, pet limits",
    listingType: "BUY",
    content: sampleListing,
  },
  {
    id: "clean-condo",
    label: "Clean condo",
    description: "Updated, under default budget",
    listingType: "BUY",
    content: cleanCondoListing,
  },
  {
    id: "rental",
    label: "Rental traps",
    description: "Extra utilities, shared laundry, no dogs",
    listingType: "RENT",
    content: rentalListing,
  },
];
