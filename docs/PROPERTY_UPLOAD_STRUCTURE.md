# Property Upload Form - Data Structure

## Step 1: Listing Type Selection
- **For Sale**
- **For Rent**
- **For Auction**

## Step 2: Property Type Selection
- **Residential** (Villa, Apartment, Townhouse, Penthouse)
- **Commercial**
- **Retail**
- **Industrial**
- **Land**
- **Office** (Traditional Office, Shared Office)
- **Agricultural**

---

## COMMON STEPS (All Categories)

### Step 3: Property Identification
```javascript
{
  propertyTitle: String,           // Listing headline
  shortDescription: String,         // Brief overview
  location: {
    country: String,
    city: String,
    suburb: String,
    streetAddress: String,
    hideAddress: Boolean,           // Hide/Unhide toggle
    coordinates: { lat: Number, lng: Number }  // From map
  }
}
```

### Step 4: Pricing & Availability
**For Sale:**
```javascript
{
  pricing: {
    currency: String,               // Currency selector
    askingPrice: Number,           // Sale: Asking Price
    priceBasis: String,            // Market appraisal, Comparable sales, etc.
    valuationDocs: [String],       // Upload valuation docs
    aiPricingInsights: Boolean     // Get AI-assisted pricing
  },
  availability: {
    status: String,                // Under construction / Off-plan / Available from
    availableFrom: Date           // Date picker
  }
}
```

**For Rent:**
```javascript
{
  pricing: {
    currency: String,
    monthlyRental: Number,        // Rental: Monthly Rental
    annualEscalation: String,      // Annual rental escalation %
    leaseTerm: String,             // Preferred lease duration
    costsInclusions: [String],    // Included in monthly rent
    leaseExclusions: [String]      // Lease exclusions
  },
  availability: {
    status: String,
    availableFrom: Date
  },
  rentalSpecific: {
    petPolicy: String,             // Allowed / Allowed with conditions / Not allowed
    petRestrictions: String,       // Size/breed restrictions, additional deposit
    smokingPolicy: String,        // Smoking permitted / Outdoors only / No smoking
    idealTenantProfile: String,    // Describe ideal tenant
    tenantMatching: [String]       // Select all that apply
  }
}
```

**For Auction:**
```javascript
{
  pricing: {
    currency: String,
    startingBid: Number,          // Auction: Starting Bid
    bidIncrement: Number,          // Minimum bid increase
    buyerPremium: Number,          // Buyer's premium (%)
    reservationFee: {
      applicable: Boolean,
      amount: Number
    },
    depositRequired: Number        // Deposit payable on acceptance (%)
  },
  auctionDetails: {
    auctionDate: Date,
    auctionTime: String,
    timeZone: String,
    exclusivityPeriod: Number      // Post-auction exclusivity (days)
  },
  auctionDocs: {
    legalPack: String,            // Link to legal documentation
    titleRegister: String          // Upload title documentation
  }
}
```

### Step 5: Listing Details
```javascript
{
  propertySize: {
    unitSystem: String,            // sqm / acres / hectares
    size: Number,                  // Property Size
    landSize: Number               // Land size (if applicable)
  },
  ownership: {
    mandate: String,              // Sole Mandate / Open Mandate / Joint Mandate
    listingVisibility: String      // Public Listing / Verified buyers only / Invite-only
  }
}
```

### Step 6: Jurisdiction & Regulatory Context
```javascript
{
  jurisdiction: {
    country: String,              // Select Country
    statutoryIdentifiers: {       // Auto-populated based on country
      identifier1: String,
      identifier2: String,
      identifier3: String,
      identifier4: String,
      identifier5: String
    }
  }
}
```

### Step 7: Mandatory Documentation
```javascript
{
  mandatoryDocs: [                 // Auto-populated based on country/jurisdiction
    {
      name: String,                // Auto-populated
      required: Boolean,
      uploaded: Boolean,
      fileUrl: String
    }
  ]
}
```

### Step 8: Fixtures & Fittings Declaration
```javascript
{
  fixtures: {
    utilitySystems: [String],      // Select all that apply
    securityFeatures: [String],
    kitchenAppliances: [String],
    leisureExternal: [String],
    otherFixtures: String          // Document any other fixtures not included
  }
}
```

### Step 9: Property Condition & Defect Disclosure
```javascript
{
  defects: {
    roof: {
      aware: Boolean,
      notes: String,
      documents: [String]
    },
    electrical: {
      aware: Boolean,
      notes: String,
      documents: [String]
    },
    plumbing: {
      aware: Boolean,
      notes: String,
      documents: [String]
    },
    foundation: {
      aware: Boolean,
      notes: String,
      documents: [String]
    },
    additionalNotes: String
  }
}
```

### Step 10: Legal & Due Diligence Declarations
```javascript
{
  legalDocs: [                     // Auto-populated based on country
    {
      name: String,
      required: Boolean,
      uploaded: Boolean,
      verified: Boolean,
      fileUrl: String
    }
  ],
  declarations: {
    agentDeclaration: Boolean,     // I confirm information is accurate
    complianceAcknowledgment: Boolean
  }
}
```

### Step 11: Primary Property Images
```javascript
{
  media: {
    coverImage: String,            // Cover image URL
    walkthroughVideo: String,      // Property walkthrough video URL
    virtual3DTour: String,         // 3D Virtual tour URL
    imageGallery: [String],        // Additional images
    droneFootage: String,          // Drone footage URL
    floorplans: [String],          // Floorplans
    constructionProgress: [String], // Construction progress images/videos
    liveCameraFeed: String,        // Live stream URL
    captions: {
      manual: Boolean,             // Write captions manually
      aiGenerated: Boolean         // Generate captions using AI
    },
    tags: {
      manual: [String],            // Add tags manually
      aiSuggested: [String]        // Allow IPM AI to suggest tags
    },
    mediaRights: {
      hasRights: Boolean,          // I confirm I have the right to upload
      accurateRepresentation: Boolean,
      noMisleadingEdits: Boolean
    },
    aiOptimization: Boolean        // Allow IPM to analyze media for search
  }
}
```

---

## CATEGORY-SPECIFIC STEPS

### RESIDENTIAL (For Sale/Rent)
```javascript
{
  residential: {
    bedrooms: Number,
    bathrooms: Number,
    livingAreaSize: Number,       // sqm / sqft
    landLotSize: Number,
    propertyType: String,          // Villa, Apartment, Townhouse, Penthouse
    parkingSpaces: Number,
    estateGatedCommunity: Boolean,
    communityInfo: String,
    epcEnergyRating: String,       // EPC / Energy Rating
    greenEnergyFeatures: [String],
    localCouncilTax: Number,
    bodyCorporateFee: {
      applicable: Boolean,
      monthlyAmount: Number
    },
    lastSalePrice: Number,
    localPermitNumber: String,
    propertyFeatures: [String],    // Notable features or upgrades
    defectsDisclosed: Boolean,
    noKnownDefects: Boolean
  }
}
```

### LAND
```javascript
{
  land: {
    netDevelopableArea: Number,
    zoning: String,
    permittedDensity: String,      // Permitted development density
    waterRightsStatus: String,
    landFeatures: String,          // Notable features
    percTestStatus: String,
    slopeCategory: String,
    utilities: {
      sewerProximity: Number,       // Distance to nearest sewer
      powerLineAccess: {
        available: Boolean,
        distance: Number
      },
      floodZone: String
    },
    subdivisionMap: String        // Upload subdivision or layout plan
  }
}
```

### INDUSTRIAL
```javascript
{
  industrial: {
    buildStatus: String,
    structuralSpecs: {
      clearHeight: String,
      loadingStyle: String,
      lightingType: String,
      floorSlabStrength: String,   // PSI
      floorThickness: String,
      columnSpacing: String
    },
    accessLoading: {
      dockDoors: Number,
      dockLevelerCapacity: String,
      driveInRamps: Boolean,
      doorDimensions: String
    },
    utilities: {
      powerAmperage: String,
      siteArea: String
    },
    specialized: {
      temperatureControlled: Boolean,
      temperatureRange: String,
      otherFacilities: String
    },
    features: {
      security24hr: Boolean,
      fireSuppression: Boolean,
      onSiteOffices: Boolean,
      yardLighting: Boolean,
      heavyVehicleAccess: Boolean,
      gatedFencedYard: Boolean,
      yardDetails: String,
      otherEnhancements: String
    }
  }
}
```

### OFFICE
```javascript
{
  office: {
    officeType: String,            // Traditional Office / Shared Office
    officeGrade: String,
    percentageRent: Number,        // Percentage Rent (%)
    fitOutCategory: String,
    tenancy: {
      anchorTenantName: String,
      mainTenantName: String,
      leaseAgreements: [String]    // Upload current lease agreements
    },
    leasing: {
      baseRent: String,
      annualRentalIncome: Number,
      walt: Number,                // Weighted Average Lease Term
      tiAllowance: Number,         // Tenant Improvement Allowance
      turnoverAudit: Boolean,
      coTenancyRights: Boolean
    },
    sizeCapacity: {
      gla: Number,                 // Gross Leasable Area (Traditional Office)
      deskCapacity: Number,        // Total Desk Capacity (Shared Office)
      deskToEmployeeRatio: Number,
      privateSuiteSizes: [String]
    },
    accessVisibility: {
      parkingRatio: Number,        // Spaces per 1,000 sqm
      mainFrontageLength: String,
      signageRights: String,
      signageStatus: String
    },
    sharedOffice: {
      membershipAccess: [String],
      amenitiesServices: [String],
      propertyFeatures: [String]
    }
  }
}
```

### COMMERCIAL / RETAIL
```javascript
{
  commercial: {
    // Similar structure to Office but with retail-specific fields
    retailType: String,
    squareFootage: Number,
    leaseTerms: {
      baseRent: Number,
      percentageRent: Number,
      leaseDuration: String
    },
    tenantInfo: {
      currentTenant: String,
      leaseExpiry: Date
    }
  }
}
```

### AGRICULTURAL
```javascript
{
  agricultural: {
    landUse: String,               // Farming, Livestock, Crops, etc.
    acreage: Number,
    waterRights: String,
    irrigation: Boolean,
    soilType: String,
    zoning: String,
    improvements: [String]        // Buildings, barns, etc.
  }
}
```

---

## FINAL STEP: Listing Preview & Publish
```javascript
{
  status: String,                  // 'Draft' or 'Published'
  readinessScore: Number,         // AI-calculated readiness percentage
  aiSuggestions: [String],         // Auto-generated suggestions
  agentDeclaration: {
    informationAccurate: Boolean,
    complianceConfirmed: Boolean,
    noMaterialFactsOmitted: Boolean
  }
}
```

---

## COMPLETE PROPERTY SCHEMA STRUCTURE
```javascript
{
  // Basic Info
  title: String,
  description: String,
  location: Object,
  price: String,
  imageUrl: String,
  
  // Listing Type
  listingType: String,            // 'for_sale', 'for_rent', 'for_auction'
  propertyCategory: String,       // 'Residential', 'Commercial', 'Retail', 'Industrial', 'Land', 'Office', 'Agricultural'
  propertyType: String,            // Specific type within category
  
  // Pricing & Availability
  pricing: Object,
  availability: Object,
  
  // Property Details
  propertySize: Object,
  ownership: Object,
  
  // Jurisdiction
  jurisdiction: Object,
  
  // Documentation
  mandatoryDocs: Array,
  legalDocs: Array,
  
  // Fixtures & Condition
  fixtures: Object,
  defects: Object,
  
  // Media
  media: Object,
  
  // Category-Specific
  residential: Object,
  land: Object,
  industrial: Object,
  office: Object,
  commercial: Object,
  agricultural: Object,
  
  // Rental/Auction Specific
  rentalSpecific: Object,
  auctionDetails: Object,
  
  // Status & Metadata
  status: String,
  agentId: ObjectId,
  readinessScore: Number,
  aiSuggestions: Array,
  declarations: Object,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

