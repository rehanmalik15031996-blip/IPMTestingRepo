import React, { useState } from "react";

const navLinks = [
  { label: "Home", href: "#" },
  { label: "About", href: "#" },
  { label: "Services", href: "#" },
  { label: "Projects", href: "#" },
  { label: "Contact", href: "#" },
];

const serviceCategories = [
  { label: "All Services", value: "all" },
  { label: "Residential", value: "residential" },
  { label: "Commercial", value: "commercial" },
  { label: "Industrial", value: "industrial" },
  { label: "Agricultural", value: "agricultural" },
];

const services = [
  {
    id: 1,
    category: "residential",
    tag: "RESIDENTIAL",
    title: "General Pest Control",
    description:
      "Comprehensive pest management solutions for your home, targeting common household pests including ants, cockroaches, spiders, and more using environmentally responsible methods.",
    features: ["Inspection & Assessment", "Treatment Plan", "Follow-up Visits"],
    price: "From $120",
    icon: "🏠",
  },
  {
    id: 2,
    category: "residential",
    tag: "RESIDENTIAL",
    title: "Termite Management",
    description:
      "Advanced termite detection and elimination services protecting your property from structural damage with long-lasting barrier treatments and monitoring systems.",
    features: ["Thermal Imaging", "Barrier Treatment", "Annual Monitoring"],
    price: "From $350",
    icon: "🔍",
  },
  {
    id: 3,
    category: "commercial",
    tag: "COMMERCIAL",
    title: "Restaurant & Food Service",
    description:
      "Specialized pest management programs designed for food service environments, ensuring compliance with health regulations and maintaining a pest-free kitchen.",
    features: ["HACCP Compliance", "Monthly Service", "Documentation"],
    price: "From $280",
    icon: "🍽",
  },
  {
    id: 4,
    category: "commercial",
    tag: "COMMERCIAL",
    title: "Office & Retail Spaces",
    description:
      "Discreet and effective pest control solutions for commercial properties, minimizing disruption to your business operations while maintaining a professional environment.",
    features: ["Flexible Scheduling", "Discreet Service", "Reporting"],
    price: "From $200",
    icon: "🏢",
  },
  {
    id: 5,
    category: "industrial",
    tag: "INDUSTRIAL",
    title: "Warehouse & Storage",
    description:
      "Large-scale pest management for warehouses and storage facilities, protecting inventory and maintaining compliance with industry standards and regulations.",
    features: ["Large Area Coverage", "Inventory Protection", "Compliance"],
    price: "From $450",
    icon: "🏭",
  },
  {
    id: 6,
    category: "agricultural",
    tag: "AGRICULTURAL",
    title: "Crop Protection",
    description:
      "Integrated pest management programs for agricultural operations, balancing effective pest control with environmental stewardship and sustainable farming practices.",
    features: ["IPM Strategy", "Minimal Chemical Use", "Yield Protection"],
    price: "Custom Quote",
    icon: "🌾",
  },
];

const processSteps = [
  {
    number: "01",
    title: "Initial Inspection",
    description:
      "Our certified technicians conduct a thorough inspection of your property to identify pest activity, entry points, and conducive conditions.",
  },
  {
    number: "02",
    title: "Customised Plan",
    description:
      "We develop a tailored integrated pest management plan specific to your property, pest pressures, and environmental considerations.",
  },
  {
    number: "03",
    title: "Treatment & Control",
    description:
      "Implementation of targeted treatments using the most effective and environmentally responsible methods available.",
  },
  {
    number: "04",
    title: "Monitoring & Prevention",
    description:
      "Ongoing monitoring and preventative measures to ensure long-term pest control success and protect your investment.",
  },
];

const testimonials = [
  {
    id: 1,
    quote:
      "IPM's team was professional, thorough, and completely resolved our termite issue. Their integrated approach gave us peace of mind knowing the problem was handled responsibly.",
    author: "Sarah Mitchell",
    role: "Homeowner, Sydney",
    initials: "SM",
  },
  {
    id: 2,
    quote:
      "As a restaurant owner, pest control is critical. IPM's commercial program keeps us compliant and pest-free. Their documentation and reporting is excellent for our health inspections.",
    author: "James Chen",
    role: "Restaurant Owner, Melbourne",
    initials: "JC",
  },
  {
    id: 3,
    quote:
      "The agricultural IPM program transformed how we manage pests on our farm. Reduced chemical use, better yields, and a healthier environment for our workers.",
    author: "Robert Dawson",
    role: "Farm Manager, Queensland",
    initials: "RD",
  },
];

const stats = [
  { value: "25+", label: "Years Experience" },
  { value: "10,000+", label: "Properties Serviced" },
  { value: "98%", label: "Client Satisfaction" },
  { value: "50+", label: "Certified Technicians" },
];

const faqs = [
  {
    question: "How long does a typical pest treatment take?",
    answer:
      "Treatment duration varies depending on the type of pest and size of the property. A standard residential treatment typically takes 1-2 hours, while larger commercial or industrial treatments may take a full day or more.",
  },
  {
    question: "Are your treatments safe for children and pets?",
    answer:
      "Yes, we use products that are registered and approved for use in residential environments. We will advise you on any necessary precautions, such as vacating the premises for a short period after treatment.",
  },
  {
    question: "How often should I have my property treated?",
    answer:
      "This depends on the pest pressure and type of service. General pest control is typically recommended every 6-12 months, while termite inspections should be conducted annually. We will recommend a schedule based on your specific situation.",
  },
  {
    question: "Do you offer a guarantee on your services?",
    answer:
      "Yes, we stand behind our work. Most of our services come with a warranty period, and we will return to re-treat at no additional cost if pests return within the warranty period.",
  },
  {
    question: "What is Integrated Pest Management (IPM)?",
    answer:
      "IPM is an environmentally sensitive approach to pest management that relies on a combination of common-sense practices. It uses current, comprehensive information on the life cycles of pests and their interaction with the environment to manage pest damage by the most economical means with the least possible hazard to people, property, and the environment.",
  },
];

export const Box = (): JSX.Element => {
  const [activeCategory, setActiveCategory] = useState("all");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    service: "",
    message: "",
  });

  const filteredServices =
    activeCategory === "all"
      ? services
      : services.filter((s) => s.category === activeCategory);

  const handleFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div
      className="w-full min-h-screen bg-white overflow-x-hidden"
      data-model-id="80:1251-frame"
    >
      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-white border-b border-[rgba(194,195,195,0.3)] shadow-sm">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12 flex items-center justify-between h-[72px]">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-[42px] h-[42px] bg-[rgba(16,87,92,1)] rounded-full flex items-center justify-center">
              <span className="text-white text-[11px] font-bold [font-family:'Jost',Helvetica] tracking-wider">
                IPM
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[rgba(6,6,6,1)] text-[15px] font-semibold [font-family:'Jost',Helvetica] leading-tight tracking-wide">
                IPM Services
              </span>
              <span className="text-[rgba(16,87,92,1)] text-[9px] font-medium [font-family:'Jost',Helvetica] tracking-[1.5px] uppercase">
                Pest Management
              </span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <ul className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="text-[rgba(6,6,6,1)] text-[13px] font-medium [font-family:'Jost',Helvetica] tracking-wide hover:text-[rgba(16,87,92,1)] transition-colors duration-200"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          {/* CTA Button */}
          <div className="hidden lg:flex items-center gap-4">
            <a
              href="#contact"
              className="bg-[rgba(16,87,92,1)] text-white text-[13px] font-semibold [font-family:'Jost',Helvetica] tracking-wide px-6 py-3 rounded-sm hover:bg-[rgba(45,122,106,1)] transition-colors duration-200"
            >
              Get a Quote
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden flex flex-col gap-[5px] p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            <span
              className={`block w-6 h-[2px] bg-[rgba(6,6,6,1)] transition-all duration-200 ${mobileMenuOpen ? "rotate-45 translate-y-[7px]" : ""}`}
            />
            <span
              className={`block w-6 h-[2px] bg-[rgba(6,6,6,1)] transition-all duration-200 ${mobileMenuOpen ? "opacity-0" : ""}`}
            />
            <span
              className={`block w-6 h-[2px] bg-[rgba(6,6,6,1)] transition-all duration-200 ${mobileMenuOpen ? "-rotate-45 -translate-y-[7px]" : ""}`}
            />
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-[rgba(194,195,195,0.3)] px-6 py-4">
            <ul className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-[rgba(6,6,6,1)] text-[14px] font-medium [font-family:'Jost',Helvetica] tracking-wide hover:text-[rgba(16,87,92,1)] transition-colors duration-200"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href="#contact"
                  className="inline-block bg-[rgba(16,87,92,1)] text-white text-[13px] font-semibold [font-family:'Jost',Helvetica] tracking-wide px-6 py-3 rounded-sm hover:bg-[rgba(45,122,106,1)] transition-colors duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Get a Quote
                </a>
              </li>
            </ul>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative w-full min-h-[680px] bg-[rgba(16,87,92,1)] pt-[72px] overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-[rgba(45,122,106,1)] translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[rgba(45,122,106,1)] -translate-x-1/3 translate-y-1/3" />
        </div>

        <div className="relative max-w-[1280px] mx-auto px-6 lg:px-12 py-20 lg:py-28">
          <div className="max-w-[720px]">
            {/* Tag */}
            <div className="inline-flex items-center gap-2 mb-6">
              <div className="w-8 h-[1px] bg-[rgba(255,200,2,1)]" />
              <span className="text-[rgba(255,200,2,1)] text-[9px] font-medium [font-family:'DM Mono',Helvetica] tracking-[1.98px] uppercase">
                Integrated Pest Management
              </span>
            </div>

            {/* Heading */}
            <h1 className="text-white text-[54px] lg:text-[68px] font-normal italic [font-family:'Playfair Display',Helvetica] leading-[1.03] tracking-[-0.5px] mb-6">
              Professional Pest
              <br />
              <span className="not-italic font-semibold text-[rgba(255,200,2,1)]">
                Management
              </span>{" "}
              Services
            </h1>

            {/* Subheading */}
            <p className="text-[rgba(244,240,230,0.7)] text-[16px] font-light [font-family:'Poppins',Helvetica] leading-[1.7] mb-10 max-w-[560px]">
              Protecting homes, businesses, and the environment through
              science-based integrated pest management solutions. Trusted by
              thousands of clients across Australia.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4">
              <a
                href="#services"
                className="bg-[rgba(255,200,2,1)] text-[rgba(6,6,6,1)] text-[14.5px] font-semibold [font-family:'Jost',Helvetica] px-8 py-4 rounded-sm hover:bg-[rgba(255,178,27,1)] transition-colors duration-200"
              >
                Explore Services
              </a>
              <a
                href="#contact"
                className="border border-white text-white text-[14.5px] font-semibold [font-family:'Jost',Helvetica] px-8 py-4 rounded-sm hover:bg-white hover:text-[rgba(16,87,92,1)] transition-colors duration-200"
              >
                Get a Free Quote
              </a>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="relative bg-[rgba(6,6,6,0.3)] border-t border-[rgba(255,255,255,0.1)]">
          <div className="max-w-[1280px] mx-auto px-6 lg:px-12 py-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-[rgba(255,200,2,1)] text-[28px] font-semibold [font-family:'Jost',Helvetica] leading-tight">
                    {stat.value}
                  </div>
                  <div className="text-[rgba(244,240,230,0.7)] text-[11px] font-normal [font-family:'DM Mono',Helvetica] tracking-[1.5px] uppercase mt-1">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="w-full bg-white py-20 lg:py-28">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
          {/* Section Header */}
          <div className="mb-14">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-8 h-[1px] bg-[rgba(16,87,92,1)]" />
              <span className="text-[rgba(16,87,92,1)] text-[9px] font-medium [font-family:'DM Mono',Helvetica] tracking-[1.98px] uppercase">
                What We Offer
              </span>
            </div>
            <h2 className="text-[rgba(6,6,6,1)] text-[54px] font-normal italic [font-family:'Playfair Display',Helvetica] leading-[1.06] mb-4">
              Our Services
            </h2>
            <p className="text-[rgba(6,6,6,1)] text-[16px] font-light [font-family:'Poppins',Helvetica] leading-[1.7] max-w-[560px]">
              Comprehensive pest management solutions tailored to your specific
              needs, delivered by certified professionals.
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-10">
            {serviceCategories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`px-5 py-2.5 text-[10.5px] font-semibold [font-family:'Jost',Helvetica] tracking-[0.5px] uppercase rounded-sm transition-colors duration-200 ${
                  activeCategory === cat.value
                    ? "bg-[rgba(16,87,92,1)] text-white"
                    : "bg-[rgba(225,225,225,1)] text-[rgba(6,6,6,1)] hover:bg-[rgba(194,195,195,1)]"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => (
              <article
                key={service.id}
                className="border border-[rgba(225,225,225,1)] rounded-sm p-8 hover:border-[rgba(16,87,92,1)] hover:shadow-lg transition-all duration-300 group flex flex-col"
              >
                {/* Icon */}
                <div className="w-12 h-12 bg-[rgba(16,87,92,0.08)] rounded-sm flex items-center justify-center mb-5 text-2xl group-hover:bg-[rgba(16,87,92,0.15)] transition-colors duration-200">
                  {service.icon}
                </div>

                {/* Tag */}
                <span className="text-[rgba(16,87,92,1)] text-[9px] font-medium [font-family:'DM Mono',Helvetica] tracking-[1.98px] uppercase mb-3">
                  {service.tag}
                </span>

                {/* Title */}
                <h3 className="text-[rgba(6,6,6,1)] text-[22px] font-semibold [font-family:'Jost',Helvetica] leading-[1.2] mb-3">
                  {service.title}
                </h3>

                {/* Description */}
                <p className="text-[rgba(6,6,6,1)] text-[14px] font-normal [font-family:'Jost',Helvetica] leading-[1.6] mb-5 flex-1">
                  {service.description}
                </p>

                {/* Features */}
                <ul className="flex flex-col gap-2 mb-6">
                  {service.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-[13px] font-normal [font-family:'Jost',Helvetica] text-[rgba(6,6,6,1)]"
                    >
                      <span className="w-4 h-4 rounded-full bg-[rgba(16,87,92,1)] flex items-center justify-center flex-shrink-0">
                        <svg
                          width="8"
                          height="6"
                          viewBox="0 0 8 6"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M1 3L3 5L7 1"
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* Price & CTA */}
                <div className="flex items-center justify-between pt-5 border-t border-[rgba(225,225,225,1)]">
                  <span className="text-[rgba(16,87,92,1)] text-[13px] font-bold [font-family:'Jost',Helvetica]">
                    {service.price}
                  </span>
                  <a
                    href="#contact"
                    className="text-[rgba(6,6,6,1)] text-[12px] font-semibold [font-family:'Jost',Helvetica] tracking-[1px] uppercase underline underline-offset-2 hover:text-[rgba(16,87,92,1)] transition-colors duration-200"
                  >
                    Enquire
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="w-full bg-[rgba(16,87,92,1)] py-20 lg:py-28">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
          {/* Section Header */}
          <div className="mb-14">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-8 h-[1px] bg-[rgba(255,200,2,1)]" />
              <span className="text-[rgba(255,200,2,1)] text-[9px] font-medium [font-family:'DM Mono',Helvetica] tracking-[1.98px] uppercase">
                How It Works
              </span>
            </div>
            <h2 className="text-white text-[54px] font-normal italic [font-family:'Playfair Display',Helvetica] leading-[1.06] mb-4">
              Our Process
            </h2>
            <p className="text-[rgba(244,240,230,0.7)] text-[16px] font-light [font-family:'Poppins',Helvetica] leading-[1.7] max-w-[560px]">
              A systematic, science-based approach to pest management that
              delivers lasting results.
            </p>
          </div>

          {/* Process Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {processSteps.map((step, index) => (
              <div key={step.number} className="relative">
                {/* Connector line */}
                {index < processSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[calc(100%_-_16px)] w-[calc(100%_-_32px)] h-[1px] bg-[rgba(255,255,255,0.2)] z-0" />
                )}

                <div className="relative z-10">
                  {/* Step Number */}
                  <div className="w-16 h-16 border border-[rgba(255,200,2,1)] rounded-sm flex items-center justify-center mb-5">
                    <span className="text-[rgba(255,200,2,1)] text-[22px] font-semibold [font-family:'Jost',Helvetica]">
                      {step.number}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-white text-[18px] font-semibold [font-family:'Jost',Helvetica] leading-tight mb-3">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="text-[rgba(244,240,230,0.7)] text-[14px] font-normal [font-family:'Jost',Helvetica] leading-[1.6]">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="w-full bg-[rgba(240,235,224,0.8)] py-20 lg:py-28">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div>
              <div className="inline-flex items-center gap-2 mb-4">
                <div className="w-8 h-[1px] bg-[rgba(16,87,92,1)]" />
                <span className="text-[rgba(16,87,92,1)] text-[9px] font-medium [font-family:'DM Mono',Helvetica] tracking-[1.98px] uppercase">
                  Why Choose IPM
                </span>
              </div>
              <h2 className="text-[rgba(6,6,6,1)] text-[54px] font-normal italic [font-family:'Playfair Display',Helvetica] leading-[1.06] mb-6">
                The IPM Difference
              </h2>
              <p className="text-[rgba(6,6,6,1)] text-[16px] font-light [font-family:'Poppins',Helvetica] leading-[1.7] mb-8">
                We combine cutting-edge technology with decades of expertise to
                deliver pest management solutions that are effective,
                sustainable, and safe for your family and the environment.
              </p>

              {/* Benefits List */}
              <ul className="flex flex-col gap-5">
                {[
                  {
                    title: "Certified Professionals",
                    desc: "All technicians are fully licensed and regularly trained in the latest IPM techniques.",
                  },
                  {
                    title: "Eco-Friendly Methods",
                    desc: "We prioritise low-impact treatments that protect the environment and non-target species.",
                  },
                  {
                    title: "Guaranteed Results",
                    desc: "Our services come with a satisfaction guarantee and warranty on all treatments.",
                  },
                  {
                    title: "Transparent Reporting",
                    desc: "Detailed reports and documentation provided after every service visit.",
                  },
                ].map((benefit) => (
                  <li key={benefit.title} className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-[rgba(16,87,92,1)] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg
                        width="10"
                        height="8"
                        viewBox="0 0 10 8"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M1 4L3.5 6.5L9 1"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-[rgba(6,6,6,1)] text-[14px] font-semibold [font-family:'Jost',Helvetica] mb-1">
                        {benefit.title}
                      </h4>
                      <p className="text-[rgba(6,6,6,1)] text-[13px] font-normal [font-family:'Jost',Helvetica] leading-[1.6]">
                        {benefit.desc}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right Visual */}
            <div className="relative">
              <div className="bg-[rgba(16,87,92,1)] rounded-sm p-10 relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-[rgba(45,122,106,0.3)] translate-x-1/4 -translate-y-1/4" />
                <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-[rgba(45,122,106,0.2)] -translate-x-1/4 translate-y-1/4" />

                <div className="relative z-10">
                  <blockquote className="text-white text-[35px] font-normal italic [font-family:'Playfair Display',Helvetica] leading-[1.2] mb-6">
                    "Science-based solutions for a pest-free environment."
                  </blockquote>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[rgba(255,200,2,1)] flex items-center justify-center">
                      <span className="text-[rgba(6,6,6,1)] text-[13px] font-bold [font-family:'Jost',Helvetica]">
                        IPM
                      </span>
                    </div>
                    <div>
                      <div className="text-white text-[14px] font-semibold [font-family:'Jost',Helvetica]">
                        IPM Services
                      </div>
                      <div className="text-[rgba(244,240,230,0.7)] text-[11px] font-normal [font-family:'DM Mono',Helvetica] tracking-[1.5px] uppercase">
                        Est. 1999
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -bottom-5 -left-5 bg-[rgba(255,200,2,1)] rounded-sm p-5 shadow-lg">
                <div className="text-[rgba(6,6,6,1)] text-[28px] font-semibold [font-family:'Jost',Helvetica] leading-tight">
                  25+
                </div>
                <div className="text-[rgba(6,6,6,1)] text-[10px] font-medium [font-family:'DM Mono',Helvetica] tracking-[1.5px] uppercase">
                  Years of Excellence
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="w-full bg-white py-20 lg:py-28">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
          {/* Section Header */}
          <div className="mb-14">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-8 h-[1px] bg-[rgba(16,87,92,1)]" />
              <span className="text-[rgba(16,87,92,1)] text-[9px] font-medium [font-family:'DM Mono',Helvetica] tracking-[1.98px] uppercase">
                Client Stories
              </span>
            </div>
            <h2 className="text-[rgba(6,6,6,1)] text-[54px] font-normal italic [font-family:'Playfair Display',Helvetica] leading-[1.06]">
              What Our Clients Say
            </h2>
          </div>

          {/* Testimonials Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial) => (
              <blockquote
                key={testimonial.id}
                className="border border-[rgba(225,225,225,1)] rounded-sm p-8 flex flex-col"
              >
                {/* Quote mark */}
                <div className="text-[rgba(16,87,92,1)] text-[48px] font-normal [font-family:'Playfair Display',Helvetica] leading-none mb-4 -mt-2">
                  "
                </div>

                {/* Quote text */}
                <p className="text-[rgba(6,6,6,1)] text-[14px] font-normal italic [font-family:'Playfair Display',Helvetica] leading-[1.6] mb-6 flex-1">
                  {testimonial.quote}
                </p>

                {/* Author */}
                <footer className="flex items-center gap-3 pt-5 border-t border-[rgba(225,225,225,1)]">
                  <div className="w-10 h-10 rounded-full bg-[rgba(16,87,92,1)] flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-[11px] font-bold [font-family:'Jost',Helvetica]">
                      {testimonial.initials}
                    </span>
                  </div>
                  <div>
                    <div className="text-[rgba(6,6,6,1)] text-[13px] font-semibold [font-family:'Jost',Helvetica]">
                      {testimonial.author}
                    </div>
                    <div className="text-[rgba(194,195,195,1)] text-[11px] font-normal [font-family:'DM Mono',Helvetica] tracking-[0.5px]">
                      {testimonial.role}
                    </div>
                  </div>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="w-full bg-[rgba(240,235,224,0.8)] py-20 lg:py-28">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Left Header */}
            <div>
              <div className="inline-flex items-center gap-2 mb-4">
                <div className="w-8 h-[1px] bg-[rgba(16,87,92,1)]" />
                <span className="text-[rgba(16,87,92,1)] text-[9px] font-medium [font-family:'DM Mono',Helvetica] tracking-[1.98px] uppercase">
                  FAQ
                </span>
              </div>
              <h2 className="text-[rgba(6,6,6,1)] text-[54px] font-normal italic [font-family:'Playfair Display',Helvetica] leading-[1.06] mb-6">
                Frequently Asked Questions
              </h2>
              <p className="text-[rgba(6,6,6,1)] text-[16px] font-light [font-family:'Poppins',Helvetica] leading-[1.7]">
                Have questions about our services? Find answers to the most
                common questions below, or contact us directly for personalised
                assistance.
              </p>
              <a
                href="#contact"
                className="inline-block mt-8 bg-[rgba(16,87,92,1)] text-white text-[14.5px] font-semibold [font-family:'Jost',Helvetica] px-8 py-4 rounded-sm hover:bg-[rgba(45,122,106,1)] transition-colors duration-200"
              >
                Contact Us
              </a>
            </div>

            {/* Right FAQ Accordion */}
            <div className="flex flex-col gap-3">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="border border-[rgba(225,225,225,1)] rounded-sm bg-white overflow-hidden"
                >
                  <button
                    className="w-full flex items-center justify-between px-6 py-5 text-left"
                    onClick={() => toggleFaq(index)}
                    aria-expanded={openFaq === index}
                  >
                    <span className="text-[rgba(6,6,6,1)] text-[14px] font-semibold [font-family:'Jost',Helvetica] pr-4">
                      {faq.question}
                    </span>
                    <span
                      className={`flex-shrink-0 w-6 h-6 rounded-full border border-[rgba(16,87,92,1)] flex items-center justify-center transition-transform duration-200 ${openFaq === index ? "rotate-45" : ""}`}
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M5 1V9M1 5H9"
                          stroke="rgba(16,87,92,1)"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                  </button>
                  {openFaq === index && (
                    <div className="px-6 pb-5">
                      <p className="text-[rgba(6,6,6,1)] text-[13px] font-normal [font-family:'Jost',Helvetica] leading-[1.7]">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact / Quote Section */}
      <section
        id="contact"
        className="w-full bg-[rgba(6,6,6,1)] py-20 lg:py-28"
      >
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Left Info */}
            <div>
              <div className="inline-flex items-center gap-2 mb-4">
                <div className="w-8 h-[1px] bg-[rgba(255,200,2,1)]" />
                <span className="text-[rgba(255,200,2,1)] text-[9px] font-medium [font-family:'DM Mono',Helvetica] tracking-[1.98px] uppercase">
                  Get In Touch
                </span>
              </div>
              <h2 className="text-white text-[54px] font-normal italic [font-family:'Playfair Display',Helvetica] leading-[1.06] mb-6">
                Request a Free Quote
              </h2>
              <p className="text-[rgba(244,240,230,0.7)] text-[16px] font-light [font-family:'Poppins',Helvetica] leading-[1.7] mb-10">
                Contact our team today for a free, no-obligation quote. We'll
                assess your needs and provide a tailored pest management
                solution.
              </p>

              {/* Contact Details */}
              <div className="flex flex-col gap-6">
                {[
                  {
                    label: "Phone",
                    value: "1800 IPM PEST",
                    icon: (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M14.5 11.5C14.5 11.775 14.4375 12.0625 14.3 12.3375C14.1625 12.6125 13.9875 12.875 13.75 13.1125C13.3625 13.5375 12.9375 13.7375 12.4875 13.7375C12.1625 13.7375 11.8125 13.6625 11.4375 13.5C11.075 13.3375 10.7 13.1125 10.3375 12.8125C9.9625 12.5 9.6125 12.1625 9.275 11.8C8.9375 11.4375 8.6375 11.0625 8.375 10.6875C8.1125 10.3125 7.9 9.9375 7.75 9.575C7.6 9.2125 7.525 8.8625 7.525 8.525C7.525 8.2125 7.5875 7.9125 7.7125 7.6375C7.8375 7.3625 8.025 7.1125 8.2875 6.9C8.5875 6.6375 8.9125 6.5125 9.25 6.5125C9.375 6.5125 9.5 6.5375 9.6125 6.5875C9.7375 6.6375 9.85 6.7125 9.9375 6.825L11.0875 8.4125C11.175 8.525 11.2375 8.625 11.2875 8.7125C11.3375 8.8 11.3625 8.8875 11.3625 8.9625C11.3625 9.0625 11.3375 9.1625 11.2875 9.2625C11.2375 9.3625 11.1625 9.4625 11.075 9.5625L10.7875 9.8625C10.7375 9.9125 10.7125 9.975 10.7125 10.05C10.7125 10.0875 10.7125 10.125 10.725 10.1625C10.7375 10.2 10.75 10.2375 10.7625 10.275C10.8625 10.4625 11.0375 10.7 11.2875 10.9875C11.5375 11.275 11.8 11.5625 12.075 11.8375C12.35 12.1125 12.625 12.3625 12.9 12.5875C13.175 12.8125 13.4 12.9625 13.5875 13.05C13.625 13.0625 13.6625 13.075 13.7 13.0875C13.7375 13.1 13.775 13.1 13.8125 13.1C13.9 13.1 13.9625 13.075 14.0125 13.025L14.3 12.7375C14.3875 12.65 14.4875 12.575 14.5875 12.525C14.6875 12.475 14.7875 12.45 14.8875 12.45C14.9625 12.45 15.05 12.4625 15.1375 12.5C15.225 12.5375 15.325 12.5875 15.4375 12.6625L17.05 13.8375C17.1625 13.9125 17.2375 14 17.275 14.1C17.3125 14.2 17.3375 14.3 17.3375 14.4125Z"
                          stroke="rgba(255,200,2,1)"
                          strokeWidth="1.2"
                          strokeMiterlimit="10"
                        />
                      </svg>
                    ),
                  },
                  {
                    label: "Email",
                    value: "info@ipmservices.com.au",
                    icon: (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M2 4L8 9L14 4M2 4H14V12H2V4Z"
                          stroke="rgba(255,200,2,1)"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ),
                  },
                  {
                    label: "Address",
                    value: "123 Pest Control Ave, Sydney NSW 2000",
                    icon: (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M8 1C5.79 1 4 2.79 4 5C4 8.25 8 14 8 14C8 14 12 8.25 12 5C12 2.79 10.21 1 8 1ZM8 6.5C7.17 6.5 6.5 5.83 6.5 5C6.5 4.17 7.17 3.5 8 3.5C8.83 3.5 9.5 4.17 9.5 5C9.5 5.83 8.83 6.5 8 6.5Z"
                          stroke="rgba(255,200,2,1)"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ),
                  },
                ].map((contact) => (
                  <div key={contact.label} className="flex items-start gap-4">
                    <div className="w-8 h-8 border border-[rgba(255,200,2,0.3)] rounded-sm flex items-center justify-center flex-shrink-0 mt-0.5">
                      {contact.icon}
                    </div>
                    <div>
                      <div className="text-[rgba(244,240,230,0.5)] text-[9px] font-medium [font-family:'DM Mono',Helvetica] tracking-[1.98px] uppercase mb-1">
                        {contact.label}
                      </div>
                      <div className="text-white text-[14px] font-normal [font-family:'Jost',Helvetica]">
                        {contact.value}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Form */}
            <div className="bg-white rounded-sm p-8 lg:p-10">
              <h3 className="text-[rgba(6,6,6,1)] text-[22px] font-semibold [font-family:'Jost',Helvetica] mb-6">
                Get Your Free Quote
              </h3>
              <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
                {/* Name */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="name"
                    className="text-[rgba(6,6,6,1)] text-[10.5px] font-semibold [font-family:'Jost',Helvetica] tracking-[0.5px] uppercase"
                  >
                    Full Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleFormChange}
                    placeholder="Your full name"
                    required
                    className="border border-[rgba(225,225,225,1)] rounded-sm px-4 py-3 text-[14px] font-normal [font-family:'Jost',Helvetica] text-[rgba(6,6,6,1)] placeholder:text-[rgba(194,195,195,1)] focus:border-[rgba(16,87,92,1)] focus:outline-none transition-colors duration-200 bg-white"
                  />
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="email"
                    className="text-[rgba(6,6,6,1)] text-[10.5px] font-semibold [font-family:'Jost',Helvetica] tracking-[0.5px] uppercase"
                  >
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    placeholder="your@email.com"
                    required
                    className="border border-[rgba(225,225,225,1)] rounded-sm px-4 py-3 text-[14px] font-normal [font-family:'Jost',Helvetica] text-[rgba(6,6,6,1)] placeholder:text-[rgba(194,195,195,1)] focus:border-[rgba(16,87,92,1)] focus:outline-none transition-colors duration-200 bg-white"
                  />
                </div>

                {/* Phone */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="phone"
                    className="text-[rgba(6,6,6,1)] text-[10.5px] font-semibold [font-family:'Jost',Helvetica] tracking-[0.5px] uppercase"
                  >
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleFormChange}
                    placeholder="Your phone number"
                    className="border border-[rgba(225,225,225,1)] rounded-sm px-4 py-3 text-[14px] font-normal [font-family:'Jost',Helvetica] text-[rgba(6,6,6,1)] placeholder:text-[rgba(194,195,195,1)] focus:border-[rgba(16,87,92,1)] focus:outline-none transition-colors duration-200 bg-white"
                  />
                </div>

                {/* Service */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="service"
                    className="text-[rgba(6,6,6,1)] text-[10.5px] font-semibold [font-family:'Jost',Helvetica] tracking-[0.5px] uppercase"
                  >
                    Service Required
                  </label>
                  <select
                    id="service"
                    name="service"
                    value={formData.service}
                    onChange={handleFormChange}
                    className="border border-[rgba(225,225,225,1)] rounded-sm px-4 py-3 text-[14px] font-normal [font-family:'Jost',Helvetica] text-[rgba(6,6,6,1)] focus:border-[rgba(16,87,92,1)] focus:outline-none transition-colors duration-200 bg-white appearance-none cursor-pointer"
                  >
                    <option value="">Select a service</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.title}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Message */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="message"
                    className="text-[rgba(6,6,6,1)] text-[10.5px] font-semibold [font-family:'Jost',Helvetica] tracking-[0.5px] uppercase"
                  >
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleFormChange}
                    placeholder="Tell us about your pest problem..."
                    rows={4}
                    className="border border-[rgba(225,225,225,1)] rounded-sm px-4 py-3 text-[14px] font-normal [font-family:'Jost',Helvetica] text-[rgba(6,6,6,1)] placeholder:text-[rgba(194,195,195,1)] focus:border-[rgba(16,87,92,1)] focus:outline-none transition-colors duration-200 bg-white resize-none"
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="bg-[rgba(16,87,92,1)] text-white text-[14.5px] font-semibold [font-family:'Jost',Helvetica] px-8 py-4 rounded-sm hover:bg-[rgba(45,122,106,1)] transition-colors duration-200 mt-2"
                >
                  Submit Request
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-[rgba(6,6,6,1)] border-t border-[rgba(255,255,255,0.08)] py-12">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-[42px] h-[42px] bg-[rgba(16,87,92,1)] rounded-full flex items-center justify-center">
                  <span className="text-white text-[11px] font-bold [font-family:'Jost',Helvetica] tracking-wider">
                    IPM
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-white text-[15px] font-semibold [font-family:'Jost',Helvetica] leading-tight tracking-wide">
                    IPM Services
                  </span>
                  <span className="text-[rgba(255,200,2,1)] text-[9px] font-medium [font-family:'Jost',Helvetica] tracking-[1.5px] uppercase">
                    Pest Management
                  </span>
                </div>
              </div>
              <p className="text-[rgba(244,240,230,0.5)] text-[13px] font-normal [font-family:'Jost',Helvetica] leading-[1.7]">
                Professional integrated pest management solutions for
                residential, commercial, and industrial clients.
              </p>
            </div>

            {/* Services Links */}
            <div>
              <h4 className="text-white text-[10.5px] font-semibold [font-family:'Jost',Helvetica] tracking-[1.5px] uppercase mb-5">
                Services
              </h4>
              <ul className="flex flex-col gap-3">
                {services.map((s) => (
                  <li key={s.id}>
                    <a
                      href="#services"
                      className="text-[rgba(244,240,230,0.5)] text-[13px] font-normal [font-family:'Jost',Helvetica] hover:text-white transition-colors duration-200"
                    >
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h4 className="text-white text-[10.5px] font-semibold [font-family:'Jost',Helvetica] tracking-[1.5px] uppercase mb-5">
                Company
              </h4>
              <ul className="flex flex-col gap-3">
                {[
                  "About Us",
                  "Our Team",
                  "Careers",
                  "News & Blog",
                  "Contact",
                ].map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-[rgba(244,240,230,0.5)] text-[13px] font-normal [font-family:'Jost',Helvetica] hover:text-white transition-colors duration-200"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Certifications */}
            <div>
              <h4 className="text-white text-[10.5px] font-semibold [font-family:'Jost',Helvetica] tracking-[1.5px] uppercase mb-5">
                Certifications
              </h4>
              <div className="flex flex-col gap-3">
                {[
                  "AEPMA Member",
                  "EPA Registered",
                  "ISO 9001 Certified",
                  "WorkSafe Accredited",
                ].map((cert) => (
                  <div key={cert} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[rgba(255,200,2,1)] flex-shrink-0" />
                    <span className="text-[rgba(244,240,230,0.5)] text-[13px] font-normal [font-family:'Jost',Helvetica]">
                      {cert}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-[rgba(255,255,255,0.08)] pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[rgba(244,240,230,0.3)] text-[11px] font-normal [font-family:'DM Mono',Helvetica] tracking-[0.5px]">
              © 2024 IPM Services. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              {["Privacy Policy", "Terms of Service", "Cookie Policy"].map(
                (link) => (
                  <a
                    key={link}
                    href="#"
                    className="text-[rgba(244,240,230,0.3)] text-[11px] font-normal [font-family:'DM Mono',Helvetica] tracking-[0.5px] hover:text-white transition-colors duration-200"
                  >
                    {link}
                  </a>
                ),
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
