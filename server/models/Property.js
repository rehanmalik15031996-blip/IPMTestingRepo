const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
    // --- COMMON FIELDS ---
    title: { type: String, required: true },
    location: { type: String, required: true },
    price: { type: String, required: true }, // Store as string for flexibility or Number
    description: { type: String },
    imageUrl: { type: String },
    
    // Links & Status
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    /** Bulk import traceability (e.g. PropData XLSX) — scope dedupe/cleanup to importAgencyId */
    importSource: { type: String },
    importListingRef: { type: String },
    importRecordId: { type: String },
    importAgencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    /** Cross-system ids (PropData API / XLSX, HubSpot export or API) — complements import* fields */
    externalIds: { type: mongoose.Schema.Types.Mixed },
    status: { type: String, enum: ['Draft', 'Published', 'Sold', 'Archived', 'Unavailable', 'Under Offer'], default: 'Draft' },
    isFeatured: { type: Boolean, default: false },
    /** Website visibility only (independent of pipeline status). If unset, derived from status + isFeatured. */
    websiteStatus: { type: String, enum: ['Draft', 'Published', 'Featured'], default: null },
    salePrice: { type: Number },
    saleDate: { type: Date },
    saleBuyerFirstName: { type: String },
    saleBuyerLastName: { type: String },
    saleBuyerEmail: { type: String },
    saleBuyerMobile: { type: String },
    /** Number of days to keep listing active after sale (optional). */
    soldDaysActive: { type: Number },
    offerPrice: { type: Number },
    offerDate: { type: Date },
    /** Number of days to keep listing active when Under Offer (optional). */
    underOfferDaysActive: { type: Number },
    /** On show: day and times (e.g. "Saturday 10am–2pm"). */
    onShowDay: { type: String },
    onShowTimes: { type: String },
    /** Listing has had a price reduction. */
    priceReduced: { type: Boolean, default: false },

    // --- LISTING TYPE ---
    listingType: { 
        type: String, 
        required: true,
        enum: ['for_sale', 'for_rent', 'for_auction', 'Residential', 'Commercial', 'Industrial', 'Land', 'Auction', 'Retail'] // Support both old and new
    },

    // Occupancy / investment type (seller/buyer/investor upload: Primary Home, Holiday, Long/Short Term Rentals)
    investmentType: { type: String, default: '' },
    
    // Property category and type
    propertyCategory: { type: String, enum: ['Residential', 'Commercial', 'Retail', 'Industrial', 'Land', 'Office', 'Agricultural', 'Development'] },
    type: { type: String }, // Specific type within category (Villa, Apartment, etc.)

    // --- Development unit link (one development, multiple units; group same layout) ---
    developmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Development' },
    developmentUnitGroup: { type: String },  // e.g. "Type A", "2-Bed" – groups units with same layout
    developmentUnitLabel: { type: String }, // e.g. "Unit 401", "Tower A - 12" – display label

    // --- DETAILED LOCATION ---
    locationDetails: {
        country: String,
        city: String,
        suburb: String,
        /** Province / state (e.g. PropData "Province") */
        region: String,
        streetAddress: String,
        postalCode: String,
        hideAddress: { type: Boolean, default: false },
        coordinates: { lat: Number, lng: Number }
    },

    // --- PRICING & AVAILABILITY ---
    pricing: {
        currency: { type: String, default: 'USD' },
        askingPrice: Number,
        monthlyRental: Number,
        startingBid: Number,
        bidIncrement: Number,
        buyerPremium: Number,
        reservationFee: { applicable: Boolean, amount: Number },
        depositRequired: Number,
        annualEscalation: String,
        priceBasis: String,
        valuationDocs: [String],
        purchasePrice: Number,
        purchaseDate: Date,
        currentValuation: Number
    },
    availability: {
        status: String,
        availableFrom: Date
    },

    // --- LISTING DETAILS ---
    propertySize: {
        unitSystem: String,
        size: Number,
        landSize: Number
    },
    ownership: {
        mandate: String,
        listingVisibility: String
    },

    // --- MORTGAGE (seller/buyer/investor/landlord uploads) ---
    mortgage: {
        hasMortgage: { type: Boolean, default: false },
        originalMortgageAmount: Number,
        mortgageDate: Date,
        term: String,
        outstandingBalance: Number,
        monthlyRepayment: Number
    },

    // --- JURISDICTION & REGULATORY ---
    jurisdiction: {
        country: String,
        statutoryIdentifiers: mongoose.Schema.Types.Mixed
    },

    // --- DOCUMENTATION ---
    mandatoryDocs: [{
        key: String,
        name: String,
        required: Boolean,
        uploaded: Boolean,
        fileUrl: String
    }],
    legalDocs: [{
        name: String,
        required: Boolean,
        uploaded: Boolean,
        verified: Boolean,
        fileUrl: String
    }],

    // --- FIXTURES & FITTINGS ---
    fixtures: {
        utilitySystems: [String],
        securityFeatures: [String],
        kitchenAppliances: [String],
        leisureExternal: [String],
        interiorFeatures: [String],
        parkingStorage: [String],
        otherFixtures: String
    },

    // --- PROPERTY CONDITION & DEFECTS ---
    defects: {
        roof: { aware: Boolean, notes: String, documents: [String] },
        electrical: { aware: Boolean, notes: String, documents: [String] },
        plumbing: { aware: Boolean, notes: String, documents: [String] },
        foundation: { aware: Boolean, notes: String, documents: [String] },
        additionalNotes: String
    },

    // --- MEDIA ---
    media: {
        coverImage: String,
        walkthroughVideo: String,
        virtual3DTour: String,
        imageGallery: [String],
        droneFootage: String,
        floorplans: [String],
        constructionProgress: [String],
        liveCameraFeed: String,
        captions: { manual: Boolean, aiGenerated: Boolean },
        tags: { manual: [String], aiSuggested: [String] },
        mediaRights: {
            hasRights: Boolean,
            accurateRepresentation: Boolean,
            noMisleadingEdits: Boolean
        },
        aiOptimization: Boolean
    },

    // --- CATEGORY-SPECIFIC DATA ---
    residential: {
        bedrooms: Number,
        bathrooms: Number,
        livingAreaSize: Number,
        landLotSize: Number,
        parkingSpaces: Number,
        estateGatedCommunity: Boolean,
        communityInfo: String,
        epcEnergyRating: String,
        greenEnergyFeatures: [String],
        localCouncilTax: Number,
        bodyCorporateFee: { applicable: Boolean, monthlyAmount: Number },
        lastSalePrice: Number,
        localPermitNumber: String,
        propertyFeatures: [String],
        defectsDisclosed: Boolean,
        noKnownDefects: Boolean
    },
    land: {
        netDevelopableArea: Number,
        zoning: String,
        permittedDensity: String,
        waterRightsStatus: String,
        landFeatures: String,
        percTestStatus: String,
        slopeCategory: String,
        utilities: {
            sewerProximity: Number,
            powerLineAccess: { available: Boolean, distance: Number },
            floodZone: String
        },
        subdivisionMap: String
    },
    industrial: {
        buildStatus: String,
        structuralSpecs: {
            clearHeight: String,
            loadingStyle: String,
            lightingType: String,
            floorSlabStrength: String,
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
    },
    office: {
        officeType: String,
        officeGrade: String,
        percentageRent: Number,
        fitOutCategory: String,
        tenancy: {
            anchorTenantName: String,
            mainTenantName: String,
            leaseAgreements: [String]
        },
        leasing: {
            baseRent: String,
            annualRentalIncome: Number,
            walt: Number,
            tiAllowance: Number,
            turnoverAudit: Boolean,
            coTenancyRights: Boolean
        },
        sizeCapacity: {
            gla: Number,
            deskCapacity: Number,
            deskToEmployeeRatio: Number,
            privateSuiteSizes: [String]
        },
        accessVisibility: {
            parkingRatio: Number,
            mainFrontageLength: String,
            signageRights: String,
            signageStatus: String
        },
        sharedOffice: {
            membershipAccess: [String],
            amenitiesServices: [String],
            propertyFeatures: [String]
        }
    },
    commercial: mongoose.Schema.Types.Mixed,
    agricultural: mongoose.Schema.Types.Mixed,

    // --- RENTAL/AUCTION SPECIFIC ---
    rentalSpecific: {
        leaseTerm: String,
        leaseStartDate: Date,
        leaseEndDate: Date,
        annualEscalation: String,
        costsInclusions: [String],
        leaseExclusions: [String],
        petPolicy: String,
        petRestrictions: String,
        smokingPolicy: String,
        idealTenantProfile: String,
        tenantMatching: [String]
    },
    auctionDetails: {
        auctionDate: Date,
        auctionTime: String,
        timeZone: String,
        exclusivityPeriod: Number,
        legalPack: String,
        titleRegister: String
    },

    // --- DECLARATIONS & METADATA ---
    declarations: {
        agentDeclaration: Boolean,
        complianceAcknowledgment: Boolean,
        informationAccurate: Boolean,
        noMaterialFactsOmitted: Boolean
    },
    readinessScore: Number,
    ipmScore: { type: Number, min: 0, max: 100, default: null }, // Completion score: how well listing is filled by agent
    aiSuggestions: [String],

    // --- LISTING METADATA (enrichment from address lookup) ---
    listingMetadata: { type: mongoose.Schema.Types.Mixed },

    // --- LEGACY SUPPORT ---
    // Keep legacy specs for backward compatibility
    specs: {
        beds: Number,
        baths: Number,
        sqft: Number
    },
    // Legacy details field for backward compatibility
    details: { type: mongoose.Schema.Types.Mixed }

}, { timestamps: true });

// Indexes for dashboard/CRM: agent list, sold props by agent, portfolio by createdAt
propertySchema.index({ agentId: 1, createdAt: -1 });
propertySchema.index({ agentId: 1, status: 1 });
propertySchema.index({ status: 1, agentId: 1 });
propertySchema.index({ importAgencyId: 1, importSource: 1, importListingRef: 1 });

module.exports = mongoose.model('Property', propertySchema);