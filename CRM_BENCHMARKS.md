# Alley & Street CRM Benchmarks (April 2, 2026)

This reference set focuses on publicly documented information. Most top-tier private equity firms do **not** publish full internal CRM architecture, so this list includes only verifiable disclosures and customer stories.

## Publicly Documented Fund ↔ CRM Examples

1. **PAI Partners → Intapp DealCloud**
   - Intapp client page describes PAI Partners as a private equity user and references their DealCloud deployment for pipeline/deal flow workflows.
   - Source: https://www.intapp.com/firms/pai-partners/

2. **Motive Partners → Affinity**
   - Affinity case study documents Motive using Affinity as a core CRM and reports increased deal review volume.
   - Source: https://www.affinity.co/case-studies/motive-partners

3. **Seaside Equity Partners → Affinity**
   - Affinity case study documents migration from spreadsheets to centralized CRM with reported deal sourcing outcomes.
   - Source: https://www.affinity.co/case-studies/seaside-equity-partners

4. **The Rohatyn Group → Dynamo**
   - Dynamo private equity page includes a customer highlight describing TRG’s use of Dynamo CRM + pipeline tools.
   - Source: https://www.dynamosoftware.com/markets/private-equity/

5. **BlackRock / Bessemer / Notable Capital (workflow examples in Affinity content)**
   - Affinity’s private capital page references these firms in a workflow guide context.
   - Source: https://www.affinity.co/

## Top CRM Options in the Market (Relevant to PE)

1. **Intapp DealCloud** (institutional private capital workflows, relationship intelligence, regulated-market focus)
   - https://www.intapp.com/dealcloud/

2. **Affinity CRM** (relationship intelligence + automated activity capture for private capital teams)
   - https://www.affinity.co/

3. **Dynamo CRM & Deal Management** (deal pipeline + investor relations + fund operations in one platform)
   - https://www.dynamosoftware.com/products/crm-deal-management/

4. **4Degrees** (relationship-intelligence-first workflow for PE/VC sourcing teams)
   - https://www.4degrees.ai/

5. **Salesforce Financial Services Cloud** (broad enterprise CRM platform with financial-services-specific modules)
   - https://www.salesforce.com/financial-services/cloud/

6. **Microsoft Dynamics 365 Sales** (enterprise CRM option for AI-assisted pipeline and workflow automation)
   - https://www.microsoft.com/en-us/dynamics-365/products/sales

7. **HubSpot CRM** (lighter-weight CRM for smaller teams or low-complexity workflows)
   - https://www.hubspot.com/products/crm

## What This Means for Alley & Street

Given your current team size and PE sourcing use case, the strongest practical pattern is:

1. **Relationship-intelligence CRM behavior** (owner assignment, introductions, follow-up rigor).
2. **Fast sourcing ingestion** (multi-source scan, dedupe, confidence scoring).
3. **Execution ops layer** (tasks, SLA-driven follow-ups, productivity visibility by analyst).

The implemented in-app CRM workspace (`/crm`) is designed around exactly this pattern so your two new analysts can run a disciplined sourcing engine without operational sprawl.
