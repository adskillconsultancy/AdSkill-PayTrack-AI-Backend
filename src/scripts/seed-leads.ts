import { LeadStatus } from "@prisma/client";
import prisma from "../lib/prisma";

interface RawLeadData {
  entryNumber: number;
  dateStr: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  serviceType: string;
  leadSource?: string;
  whatClientWants?: string;
  whatEmployeeDiscussed?: string;
  resumeUrl?: string;
  profileAssessment?: string;
  meetingScheduled?: string;
  meetingDateTimeStr?: string;
  status: string;
  nextFollowUpDateStr?: string;
  priority?: string;
  remarks?: string;
  clientCode: string;
  evaluationNotes?: string;
}

const RAW_LEADS: RawLeadData[] = [
  {
    entryNumber: 1,
    dateStr: "23/06/26",
    clientName: "Rumel Chowdhury",
    clientEmail: "rumel.mi.chowdhury@gmail.com",
    clientPhone: "8801777818272",
    serviceType: "General Consultation",
    leadSource: "Referral",
    whatClientWants: "Seeking family migration options to USA",
    whatEmployeeDiscussed:
      "Collected CV and advised that legal team will follow up via WhatsApp",
    resumeUrl:
      "https://drive.google.com/drive/folders/1CTmJmg2xvWypONWBLfkiwHd4qVzXRQiw?usp=sharing",
    profileAssessment: "Strong - Eligible",
    meetingScheduled: "Tentative",
    status: "In Discussion",
    nextFollowUpDateStr: "Later this week",
    priority: "High",
    remarks: "Client is Convinced and redy to start the process",
    clientCode: "AC-0001",
    evaluationNotes: "We have to sent the agreement",
  },
  {
    entryNumber: 2,
    dateStr: "23/06/26",
    clientName: "Leiran Bondoc",
    serviceType: "EB-3",
    leadSource: "Facebook/Instagram Ads",
    whatClientWants:
      "Inquiry regarding EB-3 Unskilled visa pathway and service/processing costs.",
    whatEmployeeDiscussed:
      "Provided initial information on EB-3 Unskilled, advised client to book a meeting with our attorney to review specific details. Client has not yet scheduled.",
    profileAssessment: "Pending Evaluation",
    meetingScheduled: "Tentative",
    status: "New Lead",
    nextFollowUpDateStr: "Tomorrow or day after tomorrow",
    priority: "Medium",
    remarks:
      "Client requested a Filipino speaker. Informed them none are currently active on chat but provided a translated booking message.",
    clientCode: "AC-0002",
    evaluationNotes:
      "Inbox inquiry regarding EB-3 Unskilled costs. Client preferred communicating in Filipino. I sent a translated request asking them to book a meeting with our attorney for a profile review session. Now waiting for a meeting confirmation to collect contact info.",
  },
  {
    entryNumber: 3,
    dateStr: "24/06/26",
    clientName: "Shafayet Asif",
    clientEmail: "shafayetasif@yahoo.com",
    clientPhone: "778251212771",
    serviceType: "EB-3",
    leadSource: "Facebook/Instagram Ads",
    whatClientWants:
      "Seeking family migration to USA via EB-3 pathway, Wants eligibility assessment for Skilled vs Unskilled category.",
    whatEmployeeDiscussed:
      "Confirmed profile has strong eligibility for both subcategories, Highlighted strengths (Master's degree, 9 yrs total experience, 7.5 IELTS), Collected CV/documents and scheduled consultation for Friday, June 26.",
    resumeUrl:
      "https://drive.google.com/drive/folders/1IOEJAev8qG_Oab64iR2eDU6S1PrP07AA?usp=sharing",
    profileAssessment: "Moderate - Needs More Documentation",
    meetingScheduled: "Yes",
    meetingDateTimeStr: "6/26/2026, 11'45 AM (Canada)",
    status: "Converted - Engaged",
    nextFollowUpDateStr: "06/25/2026",
    priority: "High",
    remarks:
      "Client has 4 yrs banking exp (Bangladesh), Master's degree (Canada), and 5 yrs retail/bookkeeping exp (Canada), Currently awaiting Canadian PR outcome, using EB-3 as a backup strategy for family of 4, Submitted all documents and confirmed meeting.",
    clientCode: "AC-0003",
    evaluationNotes: "We have to send EB-3 aggrement tomorrow on 27/06/2026",
  },
  {
    entryNumber: 4,
    dateStr: "11/07/2026",
    clientName: "Imtiaz Ovi",
    clientPhone: "(917) 932-5918",
    serviceType: "E-2",
    leadSource: "Facebook/Instagram Ads",
    whatClientWants: "Seeking Investor visa E2",
    whatEmployeeDiscussed:
      "Explained the process and how AdSkill can help with the whole process from start to end",
    profileAssessment: "Strong - Eligible",
    meetingScheduled: "Yes",
    meetingDateTimeStr: "Already done",
    status: "Converted - Engaged",
    nextFollowUpDateStr: "12/07/2026",
    priority: "High",
    remarks: "Client wants to start the process as soon as possible",
    clientCode: "AC-0004",
    evaluationNotes:
      "Client has visited the NY office to discuss the whole process with his sponsor, he is satisfied, he will visit again for some more discussion.",
  },
  {
    entryNumber: 5,
    dateStr: "23/07/2026",
    clientName: "Md Shahidulla Kaiser",
    clientEmail: "kaiser2cu@gmail.com",
    serviceType: "EB-2 NIW",
    leadSource: "Cold Email Campaign",
    whatClientWants:
      "Interested about EB-2 NIW visa for him and his family living in Bnagladesh",
    whatEmployeeDiscussed:
      "Reached through colde emial campaign, shared his profile has NIW potential",
    profileAssessment: "Strong - Eligible",
    meetingScheduled: "Tentative",
    status: "In Discussion",
    nextFollowUpDateStr: "24/07/2026",
    priority: "High",
    remarks: "Israt apu is handeling his emails",
    clientCode: "AC-0005",
    evaluationNotes: "Pending profile review",
  },
  {
    entryNumber: 6,
    dateStr: "03/08/2026",
    clientName: "Sayed Negm",
    clientPhone: "+20 10 07879061",
    serviceType: "EB-3",
    leadSource: "WhatsApp",
    whatClientWants:
      "Client has a friend, who can sponsor, he is interested for H2b but Egypt is not in list",
    whatEmployeeDiscussed:
      "Explained that EB3 will be better option for him, since Egypt is not in the pre-designated eligible countries, Explained the benefits of EB3 catagory.",
    profileAssessment: "Moderate - Needs More Documentation",
    meetingScheduled: "Tentative",
    status: "In Discussion",
    nextFollowUpDateStr: "05/08/2026",
    priority: "Medium",
    remarks: "N/A",
    clientCode: "AC-0006",
  },
  {
    entryNumber: 7,
    dateStr: "03/08/2026",
    clientName: "Md Imran Hussain",
    clientPhone: "(929) 422-7480",
    serviceType: "EB-3",
    leadSource: "WhatsApp",
    whatClientWants:
      "Inquiry regarding EB-3 skilled visa pathway and service/processing costs.",
    whatEmployeeDiscussed: "Offered a call to explain the process",
    profileAssessment: "Moderate - Needs More Documentation",
    meetingScheduled: "Tentative",
    status: "In Discussion",
    nextFollowUpDateStr: "05/08/2026",
    priority: "High",
    remarks: "N/A",
    clientCode: "AC-0007",
  },
  {
    entryNumber: 8,
    dateStr: "03/08/2026",
    clientName: "Asfuu",
    clientPhone: "(678) 207-6388",
    serviceType: "EB-3",
    leadSource: "WhatsApp",
    whatClientWants: "Inquiry regarding EB-3 skilled Visa job offer",
    whatEmployeeDiscussed:
      "Told we have saved his information and once we have a offer for him we will let him know",
    profileAssessment: "Weak - Not Currently Eligible",
    meetingScheduled: "Tentative",
    status: "In Discussion",
    nextFollowUpDateStr: "05/08/2026",
    priority: "Low",
    remarks: "N/A",
    clientCode: "AC-0008",
  },
  {
    entryNumber: 9,
    dateStr: "04/08/2026",
    clientName: "Gideon",
    clientPhone: "+2 33 24 362 9106",
    serviceType: "Family-Based",
    leadSource: "WhatsApp",
    whatClientWants: "Retiree client wants to move to usa and work.",
    whatEmployeeDiscussed:
      "Took his background information, his son is US citizen, so suggested to go for the IR-5 visa, which will be faster.",
    profileAssessment: "Moderate - Needs More Documentation",
    meetingScheduled: "Tentative",
    status: "New Lead",
    nextFollowUpDateStr: "07/08/2026",
    priority: "Medium",
    remarks: "N/A",
    clientCode: "AC-0009",
  },
  {
    entryNumber: 10,
    dateStr: "04/08/2026",
    clientName: "James Kwame Worae",
    clientPhone: "+2 33 54 074 7640",
    serviceType: "Other",
    leadSource: "WhatsApp",
    whatClientWants:
      "Want to study in usa or work in usa, she wants the faster way",
    whatEmployeeDiscussed:
      "Gave her options - F1 to EB3 convert, she is interested",
    profileAssessment: "Strong - Eligible",
    meetingScheduled: "Tentative",
    status: "In Discussion",
    nextFollowUpDateStr: "07/08/2026",
    priority: "High",
    remarks: "In WhatsApp",
    clientCode: "AC-0010",
  },
  {
    entryNumber: 11,
    dateStr: "06/08/2026",
    clientName: "Yohen Moonsamy",
    clientPhone: "+27 72 335 6976",
    serviceType: "EB-3",
    leadSource: "WhatsApp",
    whatClientWants: "Want assist with EB-3 unskilled visa and job offer",
    whatEmployeeDiscussed:
      "Asked for background details, and other details for job match",
    profileAssessment: "Moderate - Needs More Documentation",
    meetingScheduled: "Tentative",
    status: "New Lead",
    nextFollowUpDateStr: "08/08/2026",
    priority: "High",
    remarks: "In WhatsApp",
    clientCode: "AC-0011",
  },
  {
    entryNumber: 12,
    dateStr: "07/08/2026",
    clientName: "Rabee Khan",
    clientEmail: "mdrabbikhan271@gmail.com",
    clientPhone: "65 86190790",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://drive.google.com/drive/folders/1gJL8hq6SVhSGg-7HBWpRNRGrl0lGoGeF?usp=sharing",
    profileAssessment: "Weak - Not Currently Eligible",
    meetingScheduled: "No",
    status: "New Lead",
    nextFollowUpDateStr: "10/08/2026",
    priority: "High",
    remarks: "N/A",
    clientCode: "AC-0012",
  },
  {
    entryNumber: 13,
    dateStr: "07/08/2026",
    clientName: "Sajadul Islam",
    clientEmail: "chowsaj@gmail.com",
    clientPhone: "01965400910 / 01684859574",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Want assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://drive.google.com/drive/folders/1S0sNK0pfIatn2ttgmX_aRb26tDE9j8-B?usp=sharing",
    profileAssessment: "Strong - Eligible",
    meetingScheduled: "Yes",
    meetingDateTimeStr: "Sunday at 12:45 pm (23 August Bangladesh time)",
    status: "Converted - Engaged",
    nextFollowUpDateStr: "10/08/2026",
    priority: "High",
    remarks: "N/A",
    clientCode: "AC-0013",
    evaluationNotes:
      "He scheduled a meeting- 23 Augest, Sunday 12'45 (Bangladesh time)",
  },
  {
    entryNumber: 14,
    dateStr: "08/08/2026",
    clientName: "Khondker Rahat Hasan",
    clientPhone: "01818-114180",
    serviceType: "EB-3",
    leadSource: "WhatsApp",
    whatClientWants: "Looking for sponsorship for EB-3 Skilled",
    whatEmployeeDiscussed:
      "Approached for EB-3 Unskilled, and told him, if we have any EB-3 Skilled sponsorship, we will let him know",
    profileAssessment: "Needs Further Review",
    meetingScheduled: "No",
    status: "New Lead",
    nextFollowUpDateStr: "11/08/2026",
    priority: "Low",
    remarks: "N/A",
    clientCode: "AC-0014",
  },
  {
    entryNumber: 15,
    dateStr: "08/08/2026",
    clientName: "MOHAMMAD AL AMIN",
    clientEmail: "mohammadalamin.ca@gmail.com",
    clientPhone: "01712-649178",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://drive.google.com/drive/folders/1dF9uVyEBfAZ3IMWdAfyitx5FAghDli-4?usp=sharing",
    profileAssessment: "Strong - Eligible",
    meetingScheduled: "No",
    status: "New Lead",
    nextFollowUpDateStr: "11/08/2026",
    priority: "High",
    remarks: "Sent Email",
    clientCode: "AC-0015",
    evaluationNotes:
      "Dear Dr. Akter, Thank you for providing your professional profile for our review. We have completed a preliminary evaluation of your potential eligibility for the EB-2 National Interest Waiver (NIW). Credible foundation for EB-2 NIW in medical ultrasonography & maternal healthcare. Onara December e file process korar jnno ready hobe.",
  },
  {
    entryNumber: 16,
    dateStr: "08/08/2026",
    clientName: "Khandaker Abdul Mubin",
    clientPhone: "01711-782761",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://drive.google.com/drive/folders/1AUJ_RHu7GT-QzRKKrSRmfVmNQh9B04cC?usp=sharing",
    profileAssessment: "Weak - Not Currently Eligible",
    meetingScheduled: "No",
    status: "New Lead",
    nextFollowUpDateStr: "11/08/2026",
    priority: "High",
    remarks: "Sent Email",
    clientCode: "AC-0016",
    evaluationNotes:
      "Mathematics educator with MSc & BSc. Recommended profile development and STEM endeavor rather than traditional teaching petition.",
  },
  {
    entryNumber: 17,
    dateStr: "08/08/2026",
    clientName: "Fazlur Rahman",
    clientPhone: "01536-18144",
    serviceType: "E-2",
    leadSource: "WhatsApp",
    whatClientWants: "He couldn't explain his background information",
    whatEmployeeDiscussed: "I will call him tomorrow and get all the details",
    profileAssessment: "Pending Evaluation",
    meetingScheduled: "No",
    status: "New Lead",
    nextFollowUpDateStr: "11/08/2026",
    priority: "Low",
    remarks: "N/A",
    clientCode: "AC-0017",
    evaluationNotes: "He didn't pick up",
  },
  {
    entryNumber: 18,
    dateStr: "09/08/2026",
    clientName: "Rony Barua",
    clientPhone: "01713-212381",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://drive.google.com/drive/folders/1ynIHYTOgNPLuIlaREx5KffdBPBhu9FwC?usp=drive_link",
    profileAssessment: "Strong - Eligible",
    status: "New Lead",
    nextFollowUpDateStr: "13/08/2026",
    priority: "Medium",
    clientCode: "AC-0018",
    evaluationNotes:
      "Based on our initial evaluation, your profile has strong potential for an EB-2 NIW petition. Our professional fee for the EB-2 NIW case is $4,500, plus the applicable USCIS government filing fees.",
  },
  {
    entryNumber: 19,
    dateStr: "13/08/2026",
    clientName: "Abir Khan",
    clientPhone: "01891-798683",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://drive.google.com/drive/folders/17eV9Rg3J3NcbCd_GhG8G2FzfgRwnED1u?usp=drive_link",
    profileAssessment: "Moderate - Needs More Documentation",
    status: "New Lead",
    nextFollowUpDateStr: "13/08/2026",
    priority: "Medium",
    clientCode: "AC-0019",
    evaluationNotes:
      "He wants to apply with 5 publications, 3 of them are done, once he has the other 2 he will reach out.",
  },
  {
    entryNumber: 20,
    dateStr: "13/08/2026",
    clientName: "Shahed Islam",
    clientPhone: "01670-912554",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://drive.google.com/drive/folders/1daKCcgaWA3JM-2YdjXg9CHKeWAhI-klv?usp=drive_link",
    profileAssessment: "Strong - Eligible",
    meetingScheduled: "Yes",
    meetingDateTimeStr: "15 August Bangladesh time 1:15 PM To 1:45 PM",
    status: "New Lead",
    nextFollowUpDateStr: "13/08/2026",
    priority: "High",
    clientCode: "AC-0020",
    evaluationNotes:
      "Initial evaluation complete - case accepted! Fee: $4,500 + filing fees. Background in ICT/ELV, data centers, Rooppur Nuclear Power Plant. Scheduled meeting for Saturday, 15 August 1:15 PM BST.",
  },
  {
    entryNumber: 21,
    dateStr: "13/08/2026",
    clientName: "Uddam Hossain",
    clientPhone: "01672-930054",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://drive.google.com/drive/folders/1KOtJRoFV2-flcLQfx7tVvUawTS9IAUeS?usp=drive_link",
    profileAssessment: "Strong - Eligible",
    status: "New Lead",
    nextFollowUpDateStr: "13/08/2026",
    priority: "Medium",
    clientCode: "AC-0021",
    evaluationNotes:
      "MBA in Marketing, 10+ years progressive experience. Case accepted ($4,500 + fees). Shared meeting link.",
  },
  {
    entryNumber: 22,
    dateStr: "13/08/2026",
    clientName: "Khondker Rahat Hasan",
    clientPhone: "01818-114180",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://drive.google.com/drive/folders/1h_sTP5fPPGBLSfJyN8-S8FfDK7VFbPNs?usp=drive_link",
    profileAssessment: "Strong - Eligible",
    status: "New Lead",
    nextFollowUpDateStr: "13/08/2026",
    priority: "Medium",
    clientCode: "AC-0022",
    evaluationNotes:
      "He said few firms told him he is not eligible, but we said he is, he wan't to know which lawyer will oversee his file. I told him we will reach out soon. If Adil vaiya or Israt apu contacts him it will be better.",
  },
  {
    entryNumber: 23,
    dateStr: "13/08/2026",
    clientName: "Rashedul Hassan",
    clientPhone: "01877-651175",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://drive.google.com/drive/folders/1sercu3oeUZQUIHh2as3LR03pncLUlqBQ?usp=drive_link",
    profileAssessment: "Strong - Eligible",
    meetingScheduled: "Yes",
    meetingDateTimeStr: "22 Augest, Saturday, 10.45",
    status: "New Lead",
    nextFollowUpDateStr: "13/08/2026",
    priority: "High",
    clientCode: "AC-0023",
    evaluationNotes:
      "He scheduled a meeting- 22 Augest, Saturday, 10.45. Not attend the meeting today.",
  },
  {
    entryNumber: 24,
    dateStr: "13/08/2026",
    clientName: "Asadur Rahman",
    clientPhone: "01833-523584",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://drive.google.com/drive/folders/1gvPrF8iQa3vfW5LLX7yRF760cwvThwTP?usp=drive_link",
    profileAssessment: "Needs Further Review",
    status: "New Lead",
    nextFollowUpDateStr: "13/08/2026",
    priority: "Low",
    clientCode: "AC-0024",
    evaluationNotes: "EB3 unskilled only",
  },
  {
    entryNumber: 25,
    dateStr: "13/08/2026",
    clientName: "AISHA SOLEMAN",
    clientPhone: "01710-736681",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://drive.google.com/file/d/1iT4JdDnHjnT9UArULige0XVXMLSN8fA7/view?usp=sharing",
    profileAssessment: "Needs Further Review",
    status: "New Lead",
    nextFollowUpDateStr: "13/08/2026",
    priority: "Medium",
    clientCode: "AC-0025",
    evaluationNotes:
      "MBA in International Business. Requested research publications, citation details, and US project plan.",
  },
  {
    entryNumber: 26,
    dateStr: "13/08/2026",
    clientName: "JANNATUL MAOWA",
    clientPhone: "(929) 508-9483",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://drive.google.com/file/d/1Zep48jWZx3T5Xg3g2UKWJYQZqWdFkfrL/view?usp=sharing",
    profileAssessment: "Needs Further Review",
    status: "New Lead",
    nextFollowUpDateStr: "13/08/2026",
    priority: "High",
    clientCode: "AC-0026",
    evaluationNotes:
      "MS in Mathematics, CUNY graduate studies. Requested publications and BUET research records.",
  },
  {
    entryNumber: 27,
    dateStr: "13/08/2026",
    clientName: "Rizwan Hassan",
    clientPhone: "+9 2 327 5232082",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://docs.google.com/document/d/1LpNV-hNQBrQPcf1q2oF-S7YYufyvbpjG/edit?usp=sharing&ouid=101938889826842387085&rtpof=true&sd=true",
    profileAssessment: "Needs Further Review",
    status: "New Lead",
    nextFollowUpDateStr: "13/08/2026",
    priority: "Medium",
    clientCode: "AC-0027",
    evaluationNotes:
      "MBBS, USMLE Step 1 and Step 2, ECFMG eligible. Requested publication links and Stanford visiting instructor evidence.",
  },
  {
    entryNumber: 28,
    dateStr: "13/08/2026",
    clientName: "Abul Fazal Mohamed Rubayat",
    clientPhone: "01817-508720",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://docs.google.com/document/d/1KTWEtiAVRFHuc82_gus553YFbXvLSw9D/edit?usp=drive_link&ouid=101938889826842387085&rtpof=true&sd=true",
    profileAssessment: "Strong - Eligible",
    meetingScheduled: "Yes",
    status: "In Discussion",
    nextFollowUpDateStr: "13/08/2026",
    priority: "High",
    clientCode: "AC-0028",
    evaluationNotes:
      "Executive at IDLC Finance, FCMA, FCPA. Case accepted. He said he already had a call with Adil vaiya. Another law firm pushing him but looking for balanced agreement with us. Better to call ASAP.",
  },
  {
    entryNumber: 29,
    dateStr: "15/08/2026",
    clientName: "Wazih Ullah Tanzim",
    clientEmail: "wazihullahtanzim@gmail.com",
    serviceType: "EB-2 NIW",
    leadSource: "Cold Email Campaign",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://drive.google.com/drive/folders/1bjKdKUVICcKdSor1q0Fw9V0d4PflJ-eK?usp=sharing",
    profileAssessment: "Needs Further Review",
    status: "New Lead",
    nextFollowUpDateStr: "15/08/2026",
    priority: "Medium",
    clientCode: "AC-0029",
    evaluationNotes:
      "3.96 CGPA in CSE, master's still in progress. Advised to build profile or pursue funded PhD first.",
  },
  {
    entryNumber: 30,
    dateStr: "18/08/2026",
    clientName: "Manik K. Sarker",
    clientPhone: "01713-754854",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://drive.google.com/file/d/1O-FIX0s7Dvikot84JbUp9MhiuQoTy0vd/view?usp=sharing",
    profileAssessment: "Strong - Eligible",
    status: "New Lead",
    nextFollowUpDateStr: "21/08/2026",
    priority: "High",
    clientCode: "AC-0030",
    evaluationNotes:
      "FCA, FCMA, WA State CPA. 16+ years finance experience. Viable path toward all 3 NIW prongs. Prepared to accept case.",
  },
  {
    entryNumber: 31,
    dateStr: "18/08/2026",
    clientName: "Mohammad Salauddin",
    clientPhone: "01324-901878",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://drive.google.com/drive/folders/1tVLlc7jJHSvLEFqCkSmmS_MeUFBPWvyE?usp=sharing",
    profileAssessment: "Strong - Eligible",
    status: "New Lead",
    nextFollowUpDateStr: "21/08/2026",
    priority: "High",
    remarks: "Eligible, need profile mentoring and building",
    clientCode: "AC-0031",
    evaluationNotes:
      "MSc from Chalmers, 20+ years in power & EPC projects. Viable and worth pursuing. He said he will let me know, I told him I will give him a call next week.",
  },
  {
    entryNumber: 32,
    dateStr: "18/08/2026",
    clientName: "Chando Shager",
    clientPhone: "01894-615832",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://drive.google.com/file/d/1La2YOzl_X7b2BD_tFoSfezuR_X6K5QKj/view?usp=sharing",
    profileAssessment: "Needs Further Review",
    status: "New Lead",
    nextFollowUpDateStr: "21/08/2026",
    priority: "Low",
    remarks: "Meeting needed",
    clientCode: "AC-0032",
    evaluationNotes:
      "They will not proceed, they said it will take very long time.",
  },
  {
    entryNumber: 33,
    dateStr: "18/08/2026",
    clientName: "Sumi Kundu",
    clientPhone: "01894-615832",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://drive.google.com/file/d/1lEC7ZIcZJUVVk6b4rYPTdwS00zHJwS5J/view?usp=sharing",
    profileAssessment: "Needs Further Review",
    status: "New Lead",
    nextFollowUpDateStr: "21/08/2026",
    priority: "Medium",
    clientCode: "AC-0033",
    evaluationNotes:
      "Chief Engineer at Samsung. Needs evidence of individual project impact before filing.",
  },
  {
    entryNumber: 34,
    dateStr: "18/08/2026",
    clientName: "Mr Imran",
    clientEmail: "imranlxn@gmail.com",
    clientPhone: "01714-099404",
    serviceType: "L-1A",
    leadSource: "WhatsApp",
    whatClientWants:
      "Had meeting with Adil. L1A or E2. Client agreed to start asap.",
    whatEmployeeDiscussed:
      "Sent him checklist to his email imranlxn@gmail.com. Adil",
    profileAssessment: "Strong - Eligible",
    meetingScheduled: "Yes",
    meetingDateTimeStr: "22 Augest, Saturday, 3 pm to 3'30 pm New York time",
    status: "Converted - Engaged",
    nextFollowUpDateStr: "21/08/2026",
    priority: "High",
    remarks:
      "Sent him checklist to his email imranlxn@gmail.com. you can call or text him to see if he already sent or need help. Let me know if you need other info. Adil",
    clientCode: "AC-0034",
  },
  {
    entryNumber: 35,
    dateStr: "18/08/2026",
    clientName: "malek mollah",
    clientPhone: "01711-856761",
    serviceType: "Family-Based",
    leadSource: "WhatsApp",
    whatClientWants: "He got a rejection for F4 visa, wants solution",
    whatEmployeeDiscussed:
      "I told him Adil sir will reach out to him soon, and for the meantime I shared the meeting link he will fix a time and let me know",
    profileAssessment: "Needs Further Review",
    status: "New Lead",
    nextFollowUpDateStr: "21/08/2026",
    priority: "Medium",
    clientCode: "AC-0035",
    evaluationNotes:
      "He has a F4 rejection, his family got their visa, now he is looking for a pathway so he can move to usa. Let me know what pathway to suggest.",
  },
  {
    entryNumber: 36,
    dateStr: "18/08/2026",
    clientName: "CYGNUS AERIAL",
    clientPhone: "01755-557540",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed: "He will send me his CV today or tomorrow",
    profileAssessment: "Pending Evaluation",
    status: "New Lead",
    nextFollowUpDateStr: "21/08/2026",
    priority: "Medium",
    clientCode: "AC-0036",
  },
  {
    entryNumber: 37,
    dateStr: "18/08/2026",
    clientName: "Mahabub Sobhan",
    clientPhone: "01819-808382",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://drive.google.com/file/d/14CvYpOow1CGpZBDAM8PHtCgkcGlH5Sso/view?usp=sharing",
    profileAssessment: "Needs Further Review",
    status: "New Lead",
    nextFollowUpDateStr: "21/08/2026",
    priority: "Medium",
    remarks: "may be eligible for L1A but need verificationamd meeting",
    clientCode: "AC-0037",
    evaluationNotes:
      "Do not proceed with EB-2 NIW based solely on this resume. L-1A appears most relevant if corporate relationship exists.",
  },
  {
    entryNumber: 38,
    dateStr: "19/08/2026",
    clientName: "Nazmul Hosen",
    clientPhone: "01511-114910",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://drive.google.com/file/d/18BWfEDoHQUyTFZEkiNZptf3eupg5AgeD/view?usp=sharing",
    profileAssessment: "Weak - Not Currently Eligible",
    status: "New Lead",
    nextFollowUpDateStr: "22/08/2026",
    priority: "Medium",
    remarks: "F1 might be a good option",
    clientCode: "AC-0038",
    evaluationNotes:
      "Diploma in Engineering, diverted towards F1 visa. He said he will talk to his family.",
  },
  {
    entryNumber: 39,
    dateStr: "19/08/2026",
    clientName: "Mohammad Mozammel Hossain",
    clientPhone: "01935-474872",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "He will send CV soon",
    whatEmployeeDiscussed: "Once he sent the CV i will update it here",
    profileAssessment: "Pending Evaluation",
    status: "New Lead",
    nextFollowUpDateStr: "22/08/2026",
    priority: "Low",
    clientCode: "AC-0039",
  },
  {
    entryNumber: 40,
    dateStr: "19/08/2026",
    clientName: "Nusrat Abdullah",
    clientPhone: "01346-126747",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://drive.google.com/file/d/10OQ6sFCWsSdz4k3g7FqXmuv8_1xb8N16/view?usp=sharing",
    profileAssessment: "Weak - Not Currently Eligible",
    status: "New Lead",
    nextFollowUpDateStr: "22/08/2026",
    priority: "Low",
    clientCode: "AC-0040",
    evaluationNotes:
      "She will have to develop her profile, it’s not ready. She is not interested anymore.",
  },
  {
    entryNumber: 41,
    dateStr: "19/08/2026",
    clientName: "Selim Ahmed",
    clientPhone: "01625-746754",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://drive.google.com/file/d/1w-ZS9wEHqBTJE5TWW0fGnnIiTmnfXeJW/view?usp=sharing",
    profileAssessment: "Needs Further Review",
    status: "New Lead",
    nextFollowUpDateStr: "22/08/2026",
    priority: "Medium",
    remarks: "Suggest Eb3",
    clientCode: "AC-0041",
  },
  {
    entryNumber: 42,
    dateStr: "19/08/2026",
    clientName: "KOR",
    clientPhone: "01769-005123",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants:
      "He has already filled NIW petition, he is in europe now, he wants to do further process with us",
    whatEmployeeDiscussed: "Told him to schedule a meeting, he has Scheduled",
    profileAssessment: "Needs Further Review",
    meetingScheduled: "Yes",
    meetingDateTimeStr: "29 Augest, 8 pm UK,Ireland, Lisbon time",
    status: "New Lead",
    nextFollowUpDateStr: "22/08/2026",
    priority: "High",
    clientCode: "AC-0042",
    evaluationNotes:
      "He scheduled a meeting- 29 Augest, 8 pm UK,Ireland, Lisbon time",
  },
  {
    entryNumber: 43,
    dateStr: "19/08/2026",
    clientName: "Md Saddam",
    clientPhone: "01860-992124",
    serviceType: "EB-3",
    leadSource: "WhatsApp",
    whatClientWants: "Had meeting with Adil",
    whatEmployeeDiscussed: "Will take decision and let us know",
    profileAssessment: "Pending Evaluation",
    status: "New Lead",
    nextFollowUpDateStr: "22/08/2026",
    priority: "Medium",
    clientCode: "AC-0043",
  },
  {
    entryNumber: 44,
    dateStr: "20/08/2026",
    clientName: "Adnun Ibnew",
    clientPhone: "01911-310269",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://drive.google.com/drive/folders/12olbijFBnSvbo1VcegSCFKMuRdtLyC1I?usp=sharing",
    profileAssessment: "Moderate - Needs More Documentation",
    status: "New Lead",
    nextFollowUpDateStr: "23/08/2026",
    priority: "High",
    remarks: "Sent Email",
    clientCode: "AC-0044",
    evaluationNotes:
      "Telecom engineering leader. Moderate-to-strong EB-2 NIW potential. Move to strategy and evidence development.",
  },
  {
    entryNumber: 45,
    dateStr: "21/08/2026",
    clientName: "CHANDAN RAY",
    clientPhone: "01619-996645",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://drive.google.com/file/d/1-UBFuWOtbvnd86U1E-BPSbTnbMW9yacA/view?usp=sharing",
    profileAssessment: "Moderate - Needs More Documentation",
    status: "New Lead",
    nextFollowUpDateStr: "24/08/2026",
    priority: "Medium",
    remarks: "Sent Email",
    clientCode: "AC-0045",
    evaluationNotes:
      "Superintendent Engineer with marine/power background. Needs US academic credential evaluation first.",
  },
  {
    entryNumber: 46,
    dateStr: "24/08/2026",
    clientName: "Nengi J.taiwo",
    clientPhone: "+234 815 588 1639",
    serviceType: "General Consultation",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with B1/B2 visa, She has refusal",
    whatEmployeeDiscussed: "Gave her the meeting link to schedule a meeting",
    profileAssessment: "Needs Further Review",
    status: "New Lead",
    nextFollowUpDateStr: "27/08/2026",
    priority: "Medium",
    clientCode: "AC-0046",
  },
  {
    entryNumber: 47,
    dateStr: "25/08/2026",
    clientName: "FATIU MOHAMMED",
    clientPhone: "+2 34 803 663 4563",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://drive.google.com/file/d/103ULc7dG8PA3aCLYrYYxvA5WA1cou0qU/view?usp=sharing",
    profileAssessment: "Weak - Not Currently Eligible",
    status: "New Lead",
    nextFollowUpDateStr: "27/08/2026",
    priority: "Low",
    clientCode: "AC-0047",
    evaluationNotes: "Suggest different path",
  },
  {
    entryNumber: 48,
    dateStr: "25/08/2026",
    clientName: "tijani amidu",
    clientPhone: "+234 808 454 9750",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://drive.google.com/file/d/1D6UV53Fl-M2fRYAkeB8S14VhphI7O64l/view?usp=sharing",
    profileAssessment: "Weak - Not Currently Eligible",
    status: "New Lead",
    nextFollowUpDateStr: "27/08/2026",
    priority: "Medium",
    clientCode: "AC-0048",
    evaluationNotes:
      "His wifes CV is somehow eligible, but needs profile development, They will soon set up a meeting, I will update the time once I have the Info.",
  },
  {
    entryNumber: 49,
    dateStr: "25/08/2026",
    clientName: "AKAGHA-MARY",
    clientPhone: "+2 34 813 752 1861",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://drive.google.com/drive/folders/1zTy998lyTCtGaW21XYmwrp8fATDTWe2H?usp=sharing",
    profileAssessment: "Weak - Not Currently Eligible",
    status: "New Lead",
    nextFollowUpDateStr: "27/08/2026",
    priority: "Medium",
    clientCode: "AC-0049",
    evaluationNotes:
      "I suggested F1 and EB-3 Unskilled visa as it was adviced in the evaluation. He is interested in EB-3, I gave all the information and informed about our fees, He took our NY office address and his brother will visit us.",
  },
  {
    entryNumber: 50,
    dateStr: "25/08/2026",
    clientName: "OBANOYEN TAOFIK",
    clientPhone: "+234 703 263 2100",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://drive.google.com/drive/folders/1pNKeb5GUDzt14SC44LOh5p1hHNWtOtnN?usp=sharing",
    profileAssessment: "Weak - Not Currently Eligible",
    status: "New Lead",
    nextFollowUpDateStr: "27/08/2026",
    priority: "Low",
    clientCode: "AC-0050",
  },
  {
    entryNumber: 51,
    dateStr: "25/08/2026",
    clientName: "MAISHANU ADAMU HALIDU",
    clientPhone: "+234 903 443 1505",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://drive.google.com/file/d/1RNKlby8j1Ha-nv7VwF_FEffUr0MSGwH5/view?usp=sharing",
    profileAssessment: "Weak - Not Currently Eligible",
    status: "New Lead",
    nextFollowUpDateStr: "27/08/2026",
    priority: "Low",
    clientCode: "AC-0051",
  },
  {
    entryNumber: 52,
    dateStr: "25/08/2026",
    clientName: "Michel Mousa",
    clientPhone: "+20 12 06719200",
    serviceType: "General Consultation",
    leadSource: "WhatsApp",
    whatClientWants:
      "He dosen't know which path will be better, He gave me him CV, so we can choose the best path for him",
    whatEmployeeDiscussed:
      "I collected and updated his cv here, and told him we will get bck in a week.",
    resumeUrl:
      "https://drive.google.com/file/d/1SGXmgcyFs3hK7O1kzOW-Ui79TW6uixTL/view?usp=sharing",
    profileAssessment: "Weak - Not Currently Eligible",
    status: "New Lead",
    nextFollowUpDateStr: "27/08/2026",
    priority: "Low",
    clientCode: "AC-0052",
  },
  {
    entryNumber: 53,
    dateStr: "26/08/2026",
    clientName: "LUCKY C. OBI",
    clientPhone: "+234 810 868 6874",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://drive.google.com/file/d/1qaCUh9_9yDzZqP9xKMmS_w6OcgAFtay4/view?usp=sharing",
    profileAssessment: "Weak - Not Currently Eligible",
    status: "New Lead",
    nextFollowUpDateStr: "29/08/2026",
    priority: "Low",
    clientCode: "AC-0053",
  },
  {
    entryNumber: 54,
    dateStr: "26/08/2026",
    clientName: "OLOYEDE Oluwadayo",
    clientPhone: "+234 706 428 6855",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://docs.google.com/document/d/1qYjL9v2MGiW_c0Nxoldmjfk7T6Ta9MSC/edit?usp=sharing&ouid=101938889826842387085&rtpof=true&sd=true",
    profileAssessment: "Weak - Not Currently Eligible",
    status: "New Lead",
    nextFollowUpDateStr: "29/08/2026",
    priority: "Low",
    clientCode: "AC-0054",
  },
  {
    entryNumber: 55,
    dateStr: "26/08/2026",
    clientName: "MD. SHAKHAWATH HOSSAIN",
    clientPhone: "01902-892038",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://drive.google.com/drive/folders/16gSlJUgdcc4iEqsWnhuZfZjeDvdEa5X7?usp=sharing",
    profileAssessment: "Weak - Not Currently Eligible",
    status: "New Lead",
    nextFollowUpDateStr: "29/08/2026",
    priority: "Low",
    clientCode: "AC-0055",
  },
  {
    entryNumber: 56,
    dateStr: "27/08/2026",
    clientName: "SATISH RAVI",
    clientPhone: "+1 (617) 870-8010",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://drive.google.com/file/d/1RMW4o0bqT_kQeoF3FkazYU78TFfQbA6g/view?usp=sharing",
    profileAssessment: "Strong - Eligible",
    status: "In Discussion",
    nextFollowUpDateStr: "30/08/2026",
    priority: "High",
    remarks: "Documents should be verified.",
    clientCode: "AC-0056",
    evaluationNotes:
      "Northeastern MS in Energy Systems. Former Google, AWS, NextEra Energy. Endeavor around commercial structuring and power infrastructure for AI and data centers. Strong case.",
  },
  {
    entryNumber: 57,
    dateStr: "31/08/2026",
    clientName: "Tijani Sakeenat",
    clientPhone: "+234 808 454 9750",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://drive.google.com/file/d/1d5p6iuLUHorTHPDRtN6KUr7St7tpalBX/view?usp=sharing",
    profileAssessment: "Pending Evaluation",
    meetingScheduled: "Yes",
    meetingDateTimeStr: "September 9, Wednesday, 2 pm US time",
    status: "New Lead",
    nextFollowUpDateStr: "02/09/2026",
    priority: "Medium",
    clientCode: "AC-0057",
    evaluationNotes: "September 9, Wednesday, 2 pm US time",
  },
  {
    entryNumber: 58,
    dateStr: "07/09/2026",
    clientName: "KERIYAA ABATAMAM",
    clientPhone: "+971 56 620 1449",
    serviceType: "EB-3",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB-3 Unskilled visa",
    whatEmployeeDiscussed:
      "Collected documents and told her, I will reach out soon",
    resumeUrl:
      "https://drive.google.com/drive/folders/1yfcO4qgiM7VxDnzKD7Ei-cAAFukkXbPI?usp=sharing",
    profileAssessment: "Moderate - Needs More Documentation",
    status: "In Discussion",
    nextFollowUpDateStr: "08/09/2026",
    priority: "High",
    clientCode: "AC-0058",
  },
  {
    entryNumber: 59,
    dateStr: "17/09/2026",
    clientName: "ARIFUL HOQUE",
    clientEmail: "ranjuhoque@gmail.com",
    clientPhone: "(0) 1818703557, (0) 1670117505",
    serviceType: "EB-2 NIW",
    leadSource: "Other",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://drive.google.com/drive/folders/1wGUI_y490Lj3g0Y_mkZSrd11xpoMDVkQ?usp=sharing",
    profileAssessment: "Strong - Eligible",
    meetingScheduled: "Yes",
    meetingDateTimeStr: "September 30th, Bangladesh time 7 AM",
    status: "In Discussion",
    nextFollowUpDateStr: "01/10/2026",
    priority: "High",
    clientCode: "AC-0059",
    evaluationNotes:
      "16.7 years in banking & finance, trade finance, SWIFT, AML compliance. Master of Professional Banking from DU. Next in-depth meeting this weekend, client will reach out to Adil vaiya.",
  },
  {
    entryNumber: 60,
    dateStr: "17/09/2026",
    clientName: "Robinson Espinosa",
    clientPhone: "(+57) 324 5556966",
    serviceType: "EB-3",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB-3 Unskilled visa",
    whatEmployeeDiscussed:
      "Asked and gave all the necesary information, once he sends me his documents I will upload them here",
    profileAssessment: "Pending Evaluation",
    status: "Closed - Lost",
    priority: "Low",
    clientCode: "AC-0060",
    evaluationNotes: "Client moved forward with another agency.",
  },
  {
    entryNumber: 61,
    dateStr: "29/09/2026",
    clientName: "Dr Sayed Hossain",
    clientPhone: "+880 1768-660726",
    serviceType: "EB-2 NIW",
    leadSource: "Other",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://drive.google.com/file/d/1vls9ENNfmCNfra_baZW1Dkc90bGOMx2_/view?usp=sharing",
    profileAssessment: "Weak - Not Currently Eligible",
    status: "New Lead",
    nextFollowUpDateStr: "01/10/2026",
    priority: "Low",
    clientCode: "AC-0061",
  },
  {
    entryNumber: 62,
    dateStr: "30/09/2026",
    clientName: "Sumon Mahamud",
    clientPhone: "+880 1761-331433",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://drive.google.com/file/d/1awDCZnOzyMseEhA-udz7j9oRouIlpZ7U/view?usp=sharing",
    profileAssessment: "Weak - Not Currently Eligible",
    status: "New Lead",
    nextFollowUpDateStr: "04/10/2026",
    priority: "Low",
    clientCode: "AC-0062",
  },
  {
    entryNumber: 63,
    dateStr: "02/10/2026",
    clientName: "Foysal M Kazi",
    clientEmail: "Kazifoisal88@gmail.com",
    clientPhone: "+880 1856-653007",
    serviceType: "EB-3",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB3, E-2, EB-5",
    whatEmployeeDiscussed:
      "Took his details, explained all the visa process and charges, confirmed a meeting with him",
    profileAssessment: "Moderate - Needs More Documentation",
    meetingScheduled: "Yes",
    meetingDateTimeStr: "3 October Bangladesh time 2'45 pm",
    status: "In Discussion",
    nextFollowUpDateStr: "04/10/2026",
    priority: "High",
    clientCode: "AC-0063",
    evaluationNotes:
      "He will proceed with EB-3 Unskilled catagory We have to send him payment plan for EB-3 and agreement, he has requested to lower the price.",
  },
  {
    entryNumber: 64,
    dateStr: "02/10/2026",
    clientName: "Jahangir Alam",
    serviceType: "L-1A",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with investment visa",
    whatEmployeeDiscussed:
      "Took his details, explained the visa process and charges, confirmed a meeting with him",
    profileAssessment: "Strong - Eligible",
    meetingScheduled: "Yes",
    meetingDateTimeStr: "4 October, Bangladesh time 11'15 am - 11'45 am",
    status: "New Lead",
    nextFollowUpDateStr: "05/10/2026",
    priority: "High",
    clientCode: "AC-0064",
    evaluationNotes:
      "We have to send L-1A Checklist. We have sent the checklist, He will review them and let me know soon. We have to send him agreement after that ASAP.",
  },
  {
    entryNumber: 65,
    dateStr: "02/10/2026",
    clientName: "Md Kamal Hossain",
    clientEmail: "kamal7e@gmail.com",
    clientPhone: "+880 1757-657737",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "He didn't provided his CV, gave me details in Whatsapp and scheduled a meeting",
    profileAssessment: "Strong - Eligible",
    meetingScheduled: "Yes",
    meetingDateTimeStr: "5 October, Bangladesh time 10.30 pm - 11 pm",
    status: "New Lead",
    nextFollowUpDateStr: "06/10/2026",
    priority: "High",
    clientCode: "AC-0065",
    evaluationNotes:
      "48 years old, BSc Civil Engineer, MSc Civil Engineer, MBA, Professional Engineer. 25y+ experience in water supply, water treatment, environmental safeguards.",
  },
  {
    entryNumber: 66,
    dateStr: "02/10/2026",
    clientName: "Sham Lalwani",
    clientPhone: "+44 7985 155726",
    serviceType: "E-2",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with E-2",
    whatEmployeeDiscussed:
      "Gave him the basic idea about the visa, and he scheduled a meeting",
    profileAssessment: "Moderate - Needs More Documentation",
    meetingScheduled: "Yes",
    meetingDateTimeStr: "Oct 4th 3:15 Am US time",
    status: "New Lead",
    nextFollowUpDateStr: "04/10/2026",
    priority: "Medium",
    clientCode: "AC-0066",
  },
  {
    entryNumber: 67,
    dateStr: "03/10/2026",
    clientName: "Md Mostafizur Rahman",
    clientPhone: "+880 1672-001696",
    serviceType: "E-2",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with E-2 & EB-5 & L-1",
    whatEmployeeDiscussed:
      "Gave him the basic idea about the visa, and he scheduled a meeting",
    profileAssessment: "Strong - Eligible",
    meetingScheduled: "Yes",
    meetingDateTimeStr: "5 october, Bangladesh time 9 am",
    status: "New Lead",
    nextFollowUpDateStr: "07/10/2026",
    priority: "High",
    clientCode: "AC-0067",
    evaluationNotes:
      "Client has 15 years experience in real estate industry. His wife has 8+ years accounting experience. Interested in L-1, E-2, EB-5.",
  },
  {
    entryNumber: 68,
    dateStr: "03/10/2026",
    clientName: "Ruman Khan",
    clientPhone: "+880 701-876222",
    serviceType: "EB-3",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB3",
    whatEmployeeDiscussed: "Gave him all the information and price details",
    profileAssessment: "Pending Evaluation",
    meetingScheduled: "Tentative",
    status: "New Lead",
    nextFollowUpDateStr: "06/10/2026",
    priority: "Medium",
    clientCode: "AC-0068",
    evaluationNotes: "Have to call again, he is interested but not sure yet",
  },
  {
    entryNumber: 69,
    dateStr: "03/10/2026",
    clientName: "Kamruzzaman",
    clientPhone: "+880 1718-464333",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://drive.google.com/file/d/1BoZTwTX6iYfZH4RinXLgX2TIDEbbPRAE/view?usp=sharing",
    profileAssessment: "Weak - Not Currently Eligible",
    status: "New Lead",
    nextFollowUpDateStr: "06/10/2026",
    priority: "Low",
    clientCode: "AC-0069",
  },
  {
    entryNumber: 70,
    dateStr: "03/10/2026",
    clientName: "Kamrul Hasan",
    clientPhone: "+966 53 554 6784",
    serviceType: "E-2",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with E-2 & EB-5",
    whatEmployeeDiscussed:
      "Gave him the basic idea about the visa, and he scheduled a meeting",
    profileAssessment: "Strong - Eligible",
    meetingScheduled: "Yes",
    meetingDateTimeStr: "October 4, Bangladesh time dupur 12'45 pm",
    status: "New Lead",
    nextFollowUpDateStr: "05/10/2026",
    priority: "High",
    clientCode: "AC-0070",
    evaluationNotes:
      "We have send Payment Policy. I sent him the price breakdown",
  },
  {
    entryNumber: 71,
    dateStr: "10/10/2026",
    clientName: "Ruman Khan",
    clientPhone: "+880 1701-876222",
    serviceType: "EB-3",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB3",
    whatEmployeeDiscussed: "Gave him all the information and price details",
    profileAssessment: "Pending Evaluation",
    status: "New Lead",
    nextFollowUpDateStr: "12/10/2026",
    priority: "Medium",
    clientCode: "AC-0071",
  },
  {
    entryNumber: 72,
    dateStr: "10/10/2026",
    clientName: "Jisa Milson",
    clientPhone: "+91 87924 36063",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told her we will reach him after evaluatng his profile",
    resumeUrl:
      "https://drive.google.com/file/d/11qFNj2BRU1qfNHAiYVEHhZt9Tx6TgSrG/view?usp=sharing",
    profileAssessment: "Weak - Not Currently Eligible",
    status: "New Lead",
    nextFollowUpDateStr: "12/10/2026",
    priority: "Medium",
    remarks: "She is planning to apply for F1, Im on it",
    clientCode: "AC-0072",
    evaluationNotes:
      "Today I had a call with her, gave her deatails of the F1 visa and what things she will have to do next.",
  },
  {
    entryNumber: 73,
    dateStr: "13/10/2026",
    clientName: "Zaman",
    clientPhone: "+880 1746-155320",
    serviceType: "EB-3",
    leadSource: "Referral",
    whatClientWants: "Wants assist with EB3",
    whatEmployeeDiscussed: "Gave him all the information and price details",
    profileAssessment: "Pending Evaluation",
    status: "New Lead",
    nextFollowUpDateStr: "15/10/2026",
    priority: "Medium",
    clientCode: "AC-0073",
    evaluationNotes: "I sent the price breakdown",
  },
  {
    entryNumber: 74,
    dateStr: "13/10/2026",
    clientName: "Habibur Rahman Raju",
    clientPhone: "+880 1331-555500",
    serviceType: "EB-3",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB3",
    whatEmployeeDiscussed: "Gave him all the information and price details",
    profileAssessment: "Pending Evaluation",
    status: "New Lead",
    nextFollowUpDateStr: "15/10/2026",
    priority: "Medium",
    clientCode: "AC-0074",
    evaluationNotes: "I sent the price breakdown",
  },
  {
    entryNumber: 75,
    dateStr: "13/10/2026",
    clientName: "MD ARAFAT HOSSEN",
    clientPhone: "+971 56 206 3548",
    serviceType: "EB-3",
    leadSource: "Referral",
    whatClientWants: "Wants assist with EB3",
    whatEmployeeDiscussed: "Gave him all the information and price details",
    profileAssessment: "Pending Evaluation",
    status: "New Lead",
    nextFollowUpDateStr: "15/10/2026",
    priority: "Medium",
    clientCode: "AC-0075",
    evaluationNotes: "I sent the price breakdown",
  },
  {
    entryNumber: 76,
    dateStr: "13/10/2026",
    clientName: "Shahariar Elias",
    clientPhone: "+880 1865-687733",
    serviceType: "L-1A",
    leadSource: "Referral",
    whatClientWants: "Wants assist with proper visa pathway",
    whatEmployeeDiscussed:
      "Guided him with his profile, and he is interested with L-1A",
    profileAssessment: "Strong - Eligible",
    status: "New Lead",
    nextFollowUpDateStr: "15/10/2026",
    priority: "High",
    clientCode: "AC-0076",
    evaluationNotes: "I will send him meeting link tomorrow for L-1A. Done",
  },
  {
    entryNumber: 77,
    dateStr: "14/10/2026",
    clientName: "Ashak Mustafiz",
    clientPhone: "+880 1718-128450",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://drive.google.com/file/d/15Wx3DgrW3v2BniQ-KFvkOoWnzjvX1NXu/view?usp=sharing",
    profileAssessment: "Weak - Not Currently Eligible",
    status: "New Lead",
    nextFollowUpDateStr: "18/10/2026",
    priority: "Low",
    clientCode: "AC-0077",
  },
  {
    entryNumber: 78,
    dateStr: "14/10/2026",
    clientName: "Monir",
    clientPhone: "+880 1818-545508",
    serviceType: "EB-3",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB3",
    whatEmployeeDiscussed: "Gave him all the information and price details",
    profileAssessment: "Pending Evaluation",
    status: "New Lead",
    nextFollowUpDateStr: "18/10/2026",
    priority: "Medium",
    clientCode: "AC-0078",
  },
  {
    entryNumber: 79,
    dateStr: "14/10/2026",
    clientName: "Md. Abu A Khan",
    clientPhone: "+880 1711-060538",
    serviceType: "EB-2 NIW",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB2 NIW",
    whatEmployeeDiscussed:
      "Collected documents and told him we will reach him after evaluatng his profile",
    resumeUrl:
      "https://drive.google.com/file/d/12_bYed-H1vhFkuPCbzCZ8-5I7HXZMJ8c/view?usp=sharing",
    profileAssessment: "Weak - Not Currently Eligible",
    status: "New Lead",
    nextFollowUpDateStr: "18/10/2026",
    priority: "Low",
    clientCode: "AC-0079",
  },
  {
    entryNumber: 80,
    dateStr: "14/10/2026",
    clientName: "Md. Belal",
    clientPhone: "+880 1625-686132",
    serviceType: "Other",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with usa visa, no preferrence",
    whatEmployeeDiscussed:
      "He is a retired Army officer, retired bcz of injury, I suggested EB-3 or F1",
    profileAssessment: "Needs Further Review",
    status: "New Lead",
    nextFollowUpDateStr: "18/10/2026",
    priority: "Medium",
    clientCode: "AC-0080",
  },
  {
    entryNumber: 81,
    dateStr: "14/10/2026",
    clientName: "Mohammed Shazzadur Rahman",
    clientPhone: "+880 1767-722555",
    serviceType: "EB-3",
    leadSource: "WhatsApp",
    whatClientWants:
      "Wants assist with EB-3 for his family and his sisters family",
    whatEmployeeDiscussed: "Gave him all the information and price details",
    profileAssessment: "Moderate - Needs More Documentation",
    status: "New Lead",
    nextFollowUpDateStr: "18/10/2026",
    priority: "Medium",
    clientCode: "AC-0081",
    evaluationNotes:
      "They don't have passports yet, i told him to start preparing for passport",
  },
  {
    entryNumber: 82,
    dateStr: "14/10/2026",
    clientName: "Md Arman Miah",
    clientPhone: "+880 1709-045892",
    serviceType: "EB-3",
    leadSource: "Referral",
    whatClientWants: "Wants assist with EB3",
    whatEmployeeDiscussed: "Gave him all the information and price details",
    profileAssessment: "Pending Evaluation",
    status: "New Lead",
    nextFollowUpDateStr: "18/10/2026",
    priority: "Medium",
    clientCode: "AC-0082",
  },
  {
    entryNumber: 83,
    dateStr: "14/10/2026",
    clientName: "Mohamed alam miya",
    clientPhone: "+971 56 731 7462",
    serviceType: "EB-3",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB3",
    whatEmployeeDiscussed: "Gave him all the information and price details",
    profileAssessment: "Pending Evaluation",
    status: "New Lead",
    nextFollowUpDateStr: "18/10/2026",
    priority: "Medium",
    clientCode: "AC-0083",
  },
  {
    entryNumber: 84,
    dateStr: "14/10/2026",
    clientName: "Sufia Akther",
    clientPhone: "+880 1552-435940",
    serviceType: "E-2",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with E-2 and L-1A",
    whatEmployeeDiscussed:
      "Gave her the deatils for L-1A, E-2 and told f=her for indepth meeting she will need a paid meeting with Adil Vai",
    profileAssessment: "Strong - Eligible",
    status: "New Lead",
    nextFollowUpDateStr: "18/10/2026",
    priority: "High",
    clientCode: "AC-0084",
    evaluationNotes:
      "She will give our number to her niece iin California, then she schedule the paid meeting",
  },
  {
    entryNumber: 85,
    dateStr: "14/10/2026",
    clientName: "MD Sayed",
    clientPhone: "+48 573 055 599",
    serviceType: "EB-3",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB3",
    whatEmployeeDiscussed: "Gave him all the information and price details",
    profileAssessment: "Moderate - Needs More Documentation",
    status: "New Lead",
    nextFollowUpDateStr: "18/10/2026",
    priority: "High",
    clientCode: "AC-0085",
    evaluationNotes:
      "He got all the information and price breakdown, he will soon decide and ask for agreement. I sent the price breakdown",
  },
  {
    entryNumber: 86,
    dateStr: "15/10/2026",
    clientName: "Masuk Rahman",
    clientPhone: "+880 1711-954868",
    serviceType: "E-2",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with E-2",
    whatEmployeeDiscussed:
      "Gave him the basic idea about the visa, and he scheduled a meeting",
    profileAssessment: "Strong - Eligible",
    meetingScheduled: "Yes",
    meetingDateTimeStr: "16 October, 12:00:00 PM, In person",
    status: "New Lead",
    nextFollowUpDateStr: "18/10/2026",
    priority: "High",
    clientCode: "AC-0086",
    evaluationNotes:
      "He will visit the office In person and Advice fee is $100",
  },
  {
    entryNumber: 87,
    dateStr: "15/10/2026",
    clientName: "Saydul Islam",
    clientPhone: "+974 6008 6589",
    serviceType: "EB-3",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB3",
    whatEmployeeDiscussed: "Gave him all the information and price details",
    profileAssessment: "Pending Evaluation",
    status: "New Lead",
    nextFollowUpDateStr: "18/10/2026",
    priority: "Medium",
    clientCode: "AC-0087",
    evaluationNotes:
      "He will call me again next week. I sent the price breakdown",
  },
  {
    entryNumber: 88,
    dateStr: "15/10/2026",
    clientName: "Iftekhar",
    clientPhone: "+880 1612-091198",
    serviceType: "E-2",
    leadSource: "WhatsApp",
    whatClientWants:
      "he wants assist with E-2. he has real state business in Bangladesh, he wants to invest in section 8 housings",
    whatEmployeeDiscussed:
      "Gave him the basic idea about the visa, he will reach out again",
    profileAssessment: "Moderate - Needs More Documentation",
    status: "New Lead",
    nextFollowUpDateStr: "18/10/2026",
    priority: "Medium",
    clientCode: "AC-0088",
  },
  {
    entryNumber: 89,
    dateStr: "17/10/2026",
    clientName: "Mizanur Rahman",
    clientPhone: "+880 1838-010231",
    serviceType: "EB-3",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB3",
    whatEmployeeDiscussed: "Gave him all the information and price details",
    profileAssessment: "Pending Evaluation",
    status: "New Lead",
    nextFollowUpDateStr: "19/10/2026",
    priority: "Medium",
    clientCode: "AC-0089",
    evaluationNotes: "I sent the price breakdown",
  },
  {
    entryNumber: 90,
    dateStr: "17/10/2026",
    clientName: "safayet Ahammed",
    clientPhone: "+880 1790-216361",
    serviceType: "EB-3",
    leadSource: "WhatsApp",
    whatClientWants: "Wants assist with EB3",
    whatEmployeeDiscussed: "Gave him all the information and price details",
    profileAssessment: "Pending Evaluation",
    status: "New Lead",
    nextFollowUpDateStr: "19/10/2026",
    priority: "Medium",
    clientCode: "AC-0090",
    evaluationNotes: "I sent the price breakdown",
  },
  {
    entryNumber: 91,
    dateStr: "18/10/2026",
    clientName: "Shofiqur Islam",
    clientPhone: "+880 1711-933192",
    serviceType: "EB-3",
    leadSource: "WhatsApp",
    whatClientWants:
      "He is adil vaiya's client, he got his tourist visa, he scheduled the a meeting",
    whatEmployeeDiscussed:
      "He is adil vaiya's client, he got his tourist visa, he scheduled the a meeting",
    profileAssessment: "Strong - Eligible",
    meetingScheduled: "Yes",
    meetingDateTimeStr: "New York time Tuesday, October 20, 2026, 10:00 PM",
    status: "New Lead",
    nextFollowUpDateStr: "20/10/2026",
    priority: "High",
    clientCode: "AC-0091",
    evaluationNotes:
      "He is adil vaiya's client, he got his tourist visa, he scheduled the a meeting",
  },
];

function mapStatus(status: string): LeadStatus {
  switch (status.trim().toLowerCase()) {
    case "new lead":
      return LeadStatus.NEW;
    case "in discussion":
      return LeadStatus.IN_PROGRESS;
    case "documents pending":
      return LeadStatus.DOCUMENTS_PENDING;
    case "meeting scheduled":
      return LeadStatus.MEETING_SCHEDULED;
    case "converted - engaged":
      return LeadStatus.ENGAGED;
    case "closed - won":
      return LeadStatus.CONVERTED;
    case "closed - lost":
      return LeadStatus.LOST;
    case "not interested":
      return LeadStatus.NOT_INTERESTED;
    case "follow-up required":
      return LeadStatus.FOLLOW_UP;
    default:
      return LeadStatus.NEW;
  }
}

function parseCustomDate(dStr?: string): Date | null {
  if (!dStr) return null;
  const parts = dStr.trim().split(/[\/\-\.]/);
  if (parts.length === 3) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    const date = new Date(year, month, day, 10, 0, 0);
    if (!isNaN(date.getTime())) return date;
  }
  const direct = new Date(dStr);
  if (!isNaN(direct.getTime())) return direct;
  return null;
}

async function seedLeads() {
  console.log("🚀 Starting import of 91 CRM leads from boss's workbook...");

  // Load all services from database for matching
  const allServices = await prisma.service.findMany({
    where: { isDeleted: false },
    select: { id: true, name: true, code: true },
  });

  console.log(`Found ${allServices.length} active services in database.`);

  const superAdmin = await prisma.user.findFirst({
    where: { role: { name: "SUPER_ADMIN" } },
    select: { id: true, name: true },
  });
  console.log("SuperAdmin:", superAdmin?.name || "None");

  let createdCount = 0;
  let updatedCount = 0;

  for (const raw of RAW_LEADS) {
    console.log(`Importing [${raw.clientCode}] ${raw.clientName}...`);
    // Match service
    const serviceNorm = raw.serviceType.toUpperCase();
    const matchedService = allServices.find((s) => {
      const codeUpper = s.code.toUpperCase();
      const nameUpper = s.name.toUpperCase();
      if (
        serviceNorm === "EB-2 NIW" &&
        (codeUpper.includes("EB2") || nameUpper.includes("EB-2 NIW"))
      )
        return true;
      if (
        serviceNorm === "EB-1A" &&
        (codeUpper.includes("EB1") || nameUpper.includes("EB-1A"))
      )
        return true;
      if (
        serviceNorm === "EB-3" &&
        (codeUpper === "EB-3" || nameUpper.startsWith("EB-3"))
      )
        return true;
      if (
        serviceNorm === "E-2" &&
        (codeUpper === "E-2" || nameUpper.startsWith("E-2"))
      )
        return true;
      if (
        serviceNorm === "L-1A" &&
        (codeUpper.includes("L-1") || nameUpper.includes("L-1A"))
      )
        return true;
      if (
        serviceNorm === "EB-5" &&
        (codeUpper.includes("EB-5") || nameUpper.includes("EB-5"))
      )
        return true;
      if (
        serviceNorm.includes("FAMILY") &&
        (codeUpper.includes("FAM") || nameUpper.includes("Family"))
      )
        return true;
      if (
        serviceNorm.includes("CONSULTATION") &&
        (codeUpper.includes("CONSULT") || nameUpper.includes("Consultation"))
      )
        return true;
      return nameUpper.includes(serviceNorm) || codeUpper.includes(serviceNorm);
    });

    const parsedDate = parseCustomDate(raw.dateStr) || new Date();
    const parsedFollowUp = parseCustomDate(raw.nextFollowUpDateStr);

    const leadData = {
      entryNumber: raw.entryNumber,
      clientCode: raw.clientCode,
      fullName: raw.clientName,
      phone: raw.clientPhone || "No Phone Provided",
      email: raw.clientEmail || null,
      serviceId: matchedService ? matchedService.id : null,
      leadSource: raw.leadSource || "WhatsApp",
      whatClientWants: raw.whatClientWants || null,
      whatEmployeeDiscussed: raw.whatEmployeeDiscussed || null,
      resumeUrl: raw.resumeUrl || null,
      profileAssessment: raw.profileAssessment || "Pending Evaluation",
      meetingScheduled:
        raw.meetingScheduled || (raw.meetingDateTimeStr ? "Yes" : "No"),
      meetingDateTimeStr: raw.meetingDateTimeStr || null,
      status: mapStatus(raw.status),
      nextFollowUpDate: parsedFollowUp,
      priority: raw.priority ? raw.priority.toUpperCase() : "MEDIUM",
      remarks: raw.remarks === "N/A" ? null : raw.remarks || null,
      evaluationNotes: raw.evaluationNotes || null,
      createdById: superAdmin?.id || null,
      createdByName: superAdmin?.name || "System Import",
      createdAt: parsedDate,
    };

    const existing = await prisma.lead.findUnique({
      where: { clientCode: raw.clientCode },
    });

    if (existing) {
      await prisma.lead.update({
        where: { id: existing.id },
        data: leadData,
      });
      updatedCount++;
    } else {
      await prisma.lead.create({
        data: leadData,
      });
      createdCount++;
    }
  }

  console.log(
    `✅ Successfully seeded leads: ${createdCount} created, ${updatedCount} updated. Total 91 processed!`,
  );
}

seedLeads()
  .catch((err) => {
    console.error("❌ Error seeding leads:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
