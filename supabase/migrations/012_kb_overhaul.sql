-- Migration 012: Knowledge Base Overhaul (Benedikt Becker SDR Training)
-- Extends ICP segments, renames products→modules, adds geo priorities,
-- pain points, objections, framing rules, conversation patterns.

-- ─── 1. Rename kb_products → kb_modules ────────────────────────────────────────
ALTER TABLE kb_products RENAME TO kb_modules;

-- ─── 2. Extend kb_icp_segments ─────────────────────────────────────────────────
ALTER TABLE kb_icp_segments
  ADD COLUMN IF NOT EXISTS framing_rule           text,
  ADD COLUMN IF NOT EXISTS buyer_psyche_one_liner text,
  ADD COLUMN IF NOT EXISTS typical_deal_size      text,
  ADD COLUMN IF NOT EXISTS why_they_buy_us        text,
  ADD COLUMN IF NOT EXISTS target_title_array     text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS do_not_target_titles   text[] DEFAULT '{}';

-- ─── 3. Create kb_geographic_priorities ────────────────────────────────────────
CREATE TABLE kb_geographic_priorities (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name        text    NOT NULL, -- 'P1','P2','P3'
  tier_label       text    NOT NULL,
  countries        text[]  NOT NULL DEFAULT '{}',
  regions          text[]  NOT NULL DEFAULT '{}',
  score_multiplier numeric NOT NULL DEFAULT 1.0,
  rationale        text,
  active           boolean NOT NULL DEFAULT true,
  sort_order       int     NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ─── 4. Create kb_pain_points ──────────────────────────────────────────────────
CREATE TABLE kb_pain_points (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category             text    NOT NULL,
  pain_title           text    NOT NULL,
  pain_description     text,
  affected_segments    text[]  DEFAULT '{}',
  discovery_questions  text[]  DEFAULT '{}',
  our_solution         text,
  active               boolean NOT NULL DEFAULT true,
  sort_order           int     NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- ─── 5. Create kb_objections ───────────────────────────────────────────────────
CREATE TABLE kb_objections (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objection_text      text    NOT NULL,
  objection_category  text    NOT NULL, -- COMPETITOR,TIMING,BUDGET,NEED,PROCESS,INTERNAL
  reframe             text    NOT NULL,
  response_short      text    NOT NULL,
  response_full       text,
  follow_up_question  text,
  affected_segments   text[]  DEFAULT '{}',
  active              boolean NOT NULL DEFAULT true,
  sort_order          int     NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ─── 6. Create kb_framing_rules ────────────────────────────────────────────────
CREATE TABLE kb_framing_rules (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name         text NOT NULL,
  target_segment    text NOT NULL,
  core_frame        text NOT NULL,
  opening_hook      text,
  value_angle       text,
  proof_point_focus text,
  active            boolean NOT NULL DEFAULT true,
  sort_order        int     NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ─── 7. Create kb_conversation_patterns ────────────────────────────────────────
CREATE TABLE kb_conversation_patterns (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_name   text    NOT NULL,
  pattern_type   text    NOT NULL, -- OPENING,DISCOVERY,OBJECTION,CLOSING
  description    text,
  steps          text[]  DEFAULT '{}',
  example_script text,
  active         boolean NOT NULL DEFAULT true,
  sort_order     int     NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ─── 8. Extend kb_copy_preferences ─────────────────────────────────────────────
ALTER TABLE kb_copy_preferences
  ADD COLUMN IF NOT EXISTS source_quote text;

-- ─── RLS ────────────────────────────────────────────────────────────────────────
ALTER TABLE kb_geographic_priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_pain_points           ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_objections            ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_framing_rules         ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_conversation_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_only" ON kb_geographic_priorities FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_only" ON kb_pain_points           FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_only" ON kb_objections            FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_only" ON kb_framing_rules         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_only" ON kb_conversation_patterns FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- SEED DATA
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Geographic Priorities ──────────────────────────────────────────────────────
INSERT INTO kb_geographic_priorities (tier_name, tier_label, countries, regions, score_multiplier, rationale, sort_order) VALUES
('P1', 'Priority 1 — Core Markets',
  ARRAY['Germany','Austria','Switzerland','United Kingdom','Ireland'],
  ARRAY['DACH','UK','Great Britain'],
  1.2,
  'Home market (DACH) plus UK as the highest-concentration sponsorship market in Europe. English-language content is also easiest to personalise at scale.',
  1),
('P2', 'Priority 2 — Growth Markets',
  ARRAY['Netherlands','Belgium','Luxembourg','France','Spain','Portugal','Italy','Sweden','Norway','Denmark','Finland'],
  ARRAY['Benelux','Nordics','Western Europe','Southern Europe'],
  1.0,
  'Strong sponsorship ecosystems, high English proficiency (Nordics/Benelux), or large sport-commerce market (Spain/France/Italy). Worth prioritising after core markets.',
  2),
('P3', 'Priority 3 — Deprioritised / Long-tail',
  ARRAY['United States','Canada','Australia','Japan','Brazil','China','India','UAE','Singapore'],
  ARRAY['North America','Asia Pacific','Latin America','Middle East','Rest of World'],
  0.5,
  'Longer sales cycles, high competition, complex procurement, or limited German-language content fit. Only pursue inbound or very warm signals from these regions.',
  3);

-- ─── Update ICP Segments with new fields ───────────────────────────────────────
UPDATE kb_icp_segments SET
  framing_rule           = 'REVENUE_GROWTH',
  buyer_psyche_one_liner = 'Must justify sponsorship pricing and retain/attract paying sponsors — data is their negotiation weapon.',
  typical_deal_size      = '€15,000–€80,000/year',
  why_they_buy_us        = 'Prove media value to existing sponsors, generate compelling renewal decks, attract new sponsors with benchmark data.',
  target_title_array     = ARRAY['Head of Sponsorship','Sponsorship Manager','Head of Commercial','Commercial Director','Head of Partnerships','Partnership Manager','Head of Marketing','Marketing Director','Chief Revenue Officer','Director of Revenue'],
  do_not_target_titles   = ARRAY['IT Manager','Operations Manager','Finance Controller','Head Coach','Ticketing Manager','Stadium Manager','Academy Director','Physiotherapist','Team Manager','Kit Manager']
WHERE segment_name = 'Rights Holder';

UPDATE kb_icp_segments SET
  framing_rule           = 'ROI_FIRST',
  buyer_psyche_one_liner = 'CFO is watching every euro; they need hard ROI data to justify and expand sponsorship budgets.',
  typical_deal_size      = '€20,000–€120,000/year',
  why_they_buy_us        = 'Prove sponsorship ROI to board, optimise portfolio spend, benchmark against competitor brand activity.',
  target_title_array     = ARRAY['Head of Sponsorship','Sponsorship Manager','Head of Marketing','CMO','Chief Marketing Officer','Head of Brand','Brand Manager','Head of Partnerships','Marketing Director','VP Marketing'],
  do_not_target_titles   = ARRAY['HR Manager','IT Director','Legal Counsel','Finance Manager','Office Manager','Procurement Manager','Head of Sales','CFO','CEO (small team)']
WHERE segment_name = 'Brand';

UPDATE kb_icp_segments SET
  framing_rule           = 'EFFICIENCY',
  buyer_psyche_one_liner = 'Time is money — they want to impress clients with data-driven insights and win new business faster.',
  typical_deal_size      = '€25,000–€150,000/year (multi-client licence)',
  why_they_buy_us        = 'Scale reporting across client base, differentiate pitch with AI-powered measurement, win new RFPs.',
  target_title_array     = ARRAY['Managing Director','CEO','Head of Analytics','Data Director','Insights Director','Head of Sponsorship','Account Director','Partner','VP Strategy','Head of Data'],
  do_not_target_titles   = ARRAY['Junior Account Manager','Account Executive','HR Manager','Finance Manager','IT Manager','Office Manager','Receptionist']
WHERE segment_name = 'Agency';

UPDATE kb_icp_segments SET
  framing_rule           = 'VISIBILITY',
  buyer_psyche_one_liner = 'Commercial team under pressure to retain sponsors with limited resource — they need a story to tell.',
  typical_deal_size      = '€8,000–€40,000/year',
  why_they_buy_us        = 'Retain existing sponsors with proof-of-value reports, attract new sponsors with benchmark data, differentiate from rival clubs.',
  target_title_array     = ARRAY['Head of Commercial','Commercial Director','Head of Sponsorship','Sponsorship Manager','Partnership Manager','Marketing Director','Head of Marketing','Chief Executive','CEO','Head of Partnerships'],
  do_not_target_titles   = ARRAY['Head Coach','Assistant Coach','Physio','Scout','Academy Manager','IT Manager','Finance Manager','Operations Manager','Media Officer (junior)']
WHERE segment_name = 'Club & Team';

-- ─── Framing Rules ─────────────────────────────────────────────────────────────
INSERT INTO kb_framing_rules (rule_name, target_segment, core_frame, opening_hook, value_angle, proof_point_focus, sort_order) VALUES
('ROI_FIRST', 'Brand',
  'Every sponsorship euro must be justified. Shikenso turns gut-feel into CFO-grade data.',
  'Reference a recent sponsorship deal or campaign they ran — then ask how they measured it.',
  'Prove ROI, cut underperforming assets, double down on what works — all from one dashboard.',
  'Lead with cost-per-exposure benchmarks and competitor brand tracking case studies.',
  1),
('REVENUE_GROWTH', 'Rights Holder',
  'Sponsor retention and upsell depend on showing value before renewal conversations start.',
  'Reference their upcoming sponsorship renewal window or a recent event they hosted.',
  'Automated proof-of-value reports that sponsors actually read — cuts renewal prep from weeks to hours.',
  'Lead with retention rate improvement and sponsor-facing report examples.',
  2),
('EFFICIENCY', 'Agency',
  'Your analysts are burning hours on manual data collection. We fix that at scale.',
  'Reference the number of clients they manage or a recent industry award/campaign.',
  'One platform, all clients, automated reporting — save analyst hours and pitch AI-powered insights in your next RFP.',
  'Lead with time-saved metrics and multi-client licence success stories.',
  3),
('VISIBILITY', 'Club & Team',
  'Sponsors are asking harder questions at renewal. Show them the numbers before they ask.',
  'Reference their main shirt sponsor or a recently announced partnership.',
  'Automatically generated sponsor reports with media value, reach, and sentiment — no analyst needed.',
  'Lead with clubs of a similar size that retained or upsold sponsors after implementing Shikenso.',
  4);

-- ─── Pain Points ───────────────────────────────────────────────────────────────
INSERT INTO kb_pain_points (category, pain_title, pain_description, affected_segments, discovery_questions, our_solution, sort_order) VALUES
('ROI', 'Cannot prove sponsorship ROI',
  'Sponsors and internal stakeholders demand hard proof of return, but the data is fragmented or missing entirely.',
  ARRAY['Brand','Rights Holder','Club & Team'],
  ARRAY['How do you currently measure the return on your sponsorship investments?','What does your CFO ask when you present the sponsorship budget?','Have you ever lost a sponsorship deal because you couldn''t show the ROI?'],
  'Shikenso unifies TV, social, and digital data into a single ROI dashboard with exposure value, reach, and sentiment in real time.',
  1),
('REPORTING', 'Manual reporting takes too long',
  'Teams spend days or weeks compiling reports from multiple data sources before each sponsor meeting or renewal.',
  ARRAY['Agency','Rights Holder','Club & Team'],
  ARRAY['How long does it take your team to produce a sponsorship report today?','How many data sources do you pull from manually?','What does your analyst actually spend their time on?'],
  'Automated reporting in Shikenso cuts report generation from days to minutes — live dashboards sponsors can access directly.',
  2),
('DATA', 'Data is siloed across platforms',
  'TV, social media, digital, and event data sit in different tools, making it impossible to get a unified picture.',
  ARRAY['Brand','Agency','Rights Holder'],
  ARRAY['Where does your sponsorship performance data currently live?','Do you have a single place where you can see all your sponsorship metrics?','Which platforms are you pulling data from manually today?'],
  'Shikenso ingests data from all major channels (broadcast, social, digital, OOH) into one platform with a unified timeline view.',
  3),
('COMMERCIAL', 'Sponsor threatening not to renew',
  'An existing sponsor is dissatisfied or questioning value — the relationship is at risk without hard data to back up the pitch.',
  ARRAY['Rights Holder','Club & Team'],
  ARRAY['Do you have sponsors coming up for renewal in the next 90 days?','Have any sponsors pushed back on pricing recently?','What data do you give sponsors today to show what they''re getting?'],
  'Shikenso''s sponsor-facing reports show cumulative media value, reach, and benchmark comparisons — giving rights holders a compelling renewal narrative.',
  4),
('COMPETITIVE', 'Competitors are ahead on measurement',
  'Rival brands or clubs are using data to win sponsors and the team feels they are falling behind.',
  ARRAY['Brand','Club & Team','Rights Holder'],
  ARRAY['Are you aware of what your main competitors are doing with sponsorship measurement?','Have you lost a potential sponsor to a competitor recently?','What measurement tools, if any, are your rivals using?'],
  'Shikenso provides competitive benchmarking — showing how a brand''s or property''s sponsorship performance compares to direct rivals.',
  5),
('MEASUREMENT', 'TV exposure data is inaccurate or delayed',
  'Broadcast monitoring either doesn''t exist or relies on manual clipping, making TV exposure metrics unreliable.',
  ARRAY['Rights Holder','Brand','Club & Team'],
  ARRAY['How are you currently tracking logo appearances in TV broadcasts?','How quickly do you get broadcast data after a match or event?','Have you ever disputed broadcast measurement figures with a sponsor?'],
  'Shikenso uses real-time AI video analysis to detect brand logos and on-screen placements across broadcast feeds — no manual clipping.',
  6),
('DATA', 'Social media metrics are scattered',
  'Instagram, TikTok, YouTube, Twitter/X, and LinkedIn all require separate logins and manual aggregation.',
  ARRAY['Brand','Agency','Club & Team'],
  ARRAY['How many social platforms are you tracking for each sponsor?','Who in your team is responsible for pulling social data?','How long does it take to compile social performance for a client report?'],
  'Shikenso aggregates social mention data, reach, engagement, and sentiment across all major platforms into one timeline.',
  7),
('BENCHMARKING', 'No industry benchmark to compare against',
  'Without benchmarks, it''s impossible to know if performance is good, average, or poor relative to peers.',
  ARRAY['Brand','Rights Holder','Agency'],
  ARRAY['When a sponsor asks "is this a good result?", what do you say?','Do you have any benchmark data from similar properties or brands?','How do you set performance targets for your sponsorships?'],
  'Shikenso''s benchmark database spans hundreds of properties and brands — giving context to every metric and helping justify pricing or spend.',
  8),
('BUDGET', 'Increasing budget with no accountability',
  'The sponsorship budget is growing but there is no structured process to prove effectiveness or allocate spend optimally.',
  ARRAY['Brand'],
  ARRAY['How is your sponsorship budget decided year on year?','Is there a process for cutting underperforming sponsorships?','What happens if a sponsorship doesn''t deliver — how would you even know?'],
  'Shikenso''s portfolio view lets brand managers rank assets by media value delivered, enabling data-driven budget reallocation.',
  9),
('REPORTING', 'Board or CFO demanding ROI proof',
  'The finance team or board has started asking hard questions about sponsorship effectiveness before approving next year''s budget.',
  ARRAY['Brand'],
  ARRAY['Is your CFO or board scrutinising the sponsorship budget more than before?','Do you have a report you could show the board today that justifies your sponsorship spend?','When is your next budget approval cycle?'],
  'Shikenso provides executive-ready ROI dashboards with CPM benchmarks, exposure value, and brand lift data in a board-friendly format.',
  10),
('COMMERCIAL', 'Missing out on renewal negotiations',
  'Without data, rights holders or agencies go into renewal discussions without leverage — accepting low offers or losing deals.',
  ARRAY['Rights Holder','Agency','Club & Team'],
  ARRAY['How do you currently prepare for sponsor renewal negotiations?','What data do you bring to the renewal table?','Have you ever had to accept a lower fee because you couldn''t justify the original price?'],
  'Shikenso arms commercial teams with cumulative media value reports, reach trends, and benchmark pricing — turning renewals into data-driven negotiations.',
  11),
('MEASUREMENT', 'Cannot quantify brand visibility accurately',
  'Brand awareness and visibility are tracked via surveys or gut feel — there is no objective measurement of how often or where the brand appeared.',
  ARRAY['Brand','Rights Holder'],
  ARRAY['How do you measure how visible your brand is within a sponsorship?','What''s your current approach to tracking logo exposure across channels?','If your CMO asked "how visible were we at X event?", what would you say?'],
  'Shikenso tracks brand logo appearances across broadcast, social, and digital video using AI — giving an accurate, objective visibility score.',
  12),
('DATA', 'No real-time performance data',
  'Teams only see performance data days or weeks after an event, making it impossible to optimise in-flight campaigns.',
  ARRAY['Brand','Agency'],
  ARRAY['How quickly do you see performance data after a match or campaign goes live?','Have you ever wanted to act on a sponsorship moment in real time but couldn''t because the data wasn''t ready?','What''s the fastest you''ve been able to pull a performance update for a client?'],
  'Shikenso processes broadcast and social data within hours of an event, with live dashboards updating throughout the day.',
  13),
('REPORTING', 'Reporting to multiple stakeholders with conflicting needs',
  'The CMO wants brand metrics, the CFO wants ROI, and sponsors want reach — each requires a separate manual report.',
  ARRAY['Agency','Rights Holder'],
  ARRAY['How many different report formats do you produce for different audiences?','How much of your team''s time goes into reformatting the same data for different stakeholders?','What would it mean for your team if you could generate every report format from one data set?'],
  'Shikenso''s templated reporting engine produces CMO, CFO, and sponsor-facing versions from one data set — with a click.',
  14),
('BENCHMARKING', 'Hard to benchmark against industry peers',
  'Without access to competitor or peer data, it is impossible to tell clients or sponsors whether performance is industry-leading or average.',
  ARRAY['Agency','Rights Holder','Brand'],
  ARRAY['What do you compare your results against today — do you have any industry benchmarks?','When a prospect asks "how does this compare to the market?", what do you tell them?','Do you have access to data on what competitors are getting for similar sponsorship placements?'],
  'Shikenso''s cross-industry database provides peer benchmarking — covering media value per impression, social engagement rates, and audience quality across sports categories.',
  15),
('DATA', 'Fan engagement data not connected to sponsorship value',
  'Fan/audience data exists in a separate CRM or social tool and is never linked back to sponsorship performance.',
  ARRAY['Rights Holder','Club & Team'],
  ARRAY['Do you have audience or fan data? Is it connected to what your sponsors are paying for?','Can you tell a sponsor how engaged their target audience is with your property?','What does your fan data look like today?'],
  'Shikenso can layer audience quality data on top of media exposure — showing sponsors not just how many impressions, but how relevant those impressions were.',
  16),
('MEASUREMENT', 'Event ROI is impossible to calculate',
  'Live events generate huge amounts of potential data but it is never captured systematically — only anecdotes remain.',
  ARRAY['Brand','Rights Holder','Club & Team'],
  ARRAY['How do you measure the value of your presence at a live event versus digital-only?','Do you have a process for capturing brand exposure at events?','What happens to the measurement data after an event — where does it go?'],
  'Shikenso''s event analytics captures on-site digital screen exposures, social spikes, and broadcast mentions during and immediately after events.',
  17),
('COMMERCIAL', 'Losing new sponsor deals to better-measured competitors',
  'Prospective sponsors choose rival properties that can demonstrate data-backed audience and media value.',
  ARRAY['Rights Holder','Club & Team'],
  ARRAY['Have you lost a sponsorship prospect because a competitor property offered better measurement?','What does your sales deck look like when you''re pitching for a new sponsor?','Do you have third-party validated media value data you can share with prospects?'],
  'Shikenso''s prospect-facing sponsorship valuation report gives rights holders a professional, AI-generated media value pack to anchor any new sponsor pitch.',
  18);

-- ─── Objections ────────────────────────────────────────────────────────────────
INSERT INTO kb_objections (objection_text, objection_category, reframe, response_short, response_full, follow_up_question, affected_segments, sort_order) VALUES
('We already use a competitor tool (Relo Metrics, Nielsen, SponsorPulse, etc.)',
  'COMPETITOR',
  'They have a tool but not necessarily the outcome — move the conversation from features to results.',
  'Completely understand — most of our customers came from [competitor]. What I''d love to ask is: are you getting the automatic reporting and real-time data you were promised?',
  'Completely understand — that''s actually the situation most of our customers were in before switching. The tools you mentioned are solid, but they often require a lot of manual setup and have significant lag time. What we consistently hear is that reports still take days to produce and the data isn''t live. Is that something you''re running into? I''m not asking you to switch today — I''d just love to show you a side-by-side comparison. If what you have is working perfectly, we''ll part as friends.',
  'What does your reporting turnaround look like today — from event to report in the hands of your sponsor?',
  ARRAY['Brand','Rights Holder','Agency','Club & Team'], 1),

('We don''t have budget for this right now.',
  'BUDGET',
  'Budget objections are often timing objections. Find when the cycle resets.',
  'Totally fair — when does your budget cycle reset? I''d love to get on your radar before you go into that planning conversation.',
  'That makes complete sense, and I appreciate the honesty. I''m not looking to force anything. Can I ask — is it genuinely not in this year''s budget, or is it more that you''re not sure if the ROI is there to justify it? If it''s the latter, that''s actually something I can help with. We have an ROI calculator that most teams find useful even before they''re ready to buy. And if it''s a timing thing, I''d love to get a 20-minute call in the diary for Q3/Q4 so we can revisit when the cycle opens.',
  'When do you next go into budget planning, and who typically signs off on tools like this?',
  ARRAY['Brand','Rights Holder','Agency','Club & Team'], 2),

('We do this in-house / we have an internal analytics team.',
  'NEED',
  'In-house is a process, not a solution — surface the hidden cost of analyst time.',
  'That''s great — can I ask what tools your internal team is using? Most in-house teams we work with love Shikenso because it replaces the manual work, not the analyst.',
  'That''s really common, and honestly the best use of a strong analytics team. Here''s what I''ve found though: in-house teams are often brilliant at interpreting data, but they spend a disproportionate amount of time collecting and cleaning it. Shikenso doesn''t replace your team — it eliminates the grunt work so they can focus on strategy. What does a typical week look like for your analyst when they''re building a sponsorship report?',
  'How many hours a week would you estimate your team spends on data collection versus actual analysis?',
  ARRAY['Brand','Agency','Rights Holder'], 3),

('We''re not investing in sponsorship measurement / we don''t measure sponsorships.',
  'NEED',
  'This is the highest-value objection — they need to be educated, not sold to.',
  'That''s actually why I reached out. The brands/properties we work with used to feel the same way — until a sponsor or a CFO started asking the questions they couldn''t answer.',
  'I hear that a lot, and it''s usually one of two situations: either you''re not under pressure to measure yet, or you''ve tried before and it felt too complex to sustain. Which is closer to your situation? Because if it''s the first, I''m happy to share what the trigger usually looks like — it''s almost always a sponsor asking for proof at renewal. And if it''s the second, Shikenso was specifically built to be the tool that non-technical teams can actually run.',
  'Have any of your sponsors ever asked you to prove the value of what they''re getting?',
  ARRAY['Rights Holder','Club & Team'], 4),

('It''s not the right time — catch me in Q3 / after the season / after the event.',
  'TIMING',
  'Honour the timing but make the follow-up impossible to ignore.',
  'Completely respect that. Can I ask — is it a bandwidth thing right now, or a budget thing? Because those have different answers from my side.',
  'Absolutely no pressure — I understand how it goes when you''re mid-season or deep in an event cycle. What I''d love to do is lock in 20 minutes for [specific future date] so it doesn''t get lost. I''ll send a calendar invite and a brief overview of what we''ve built for teams similar to yours in the meantime. Would that work?',
  'Is Q3 more about bandwidth or budget? That helps me figure out what to prepare for our call.',
  ARRAY['Brand','Rights Holder','Agency','Club & Team'], 5),

('We''re happy with our current approach / we don''t need to change.',
  'NEED',
  'Satisfaction is the enemy of improvement — reframe around what they''re leaving on the table.',
  'That''s fair — what does "happy" look like for you? I ask because most teams we talk to felt the same until they saw a benchmark of what''s possible.',
  'That''s genuinely good to hear — and I don''t want to fix something that isn''t broken. My honest question is: when you say you''re happy, is that because sponsors are satisfied and asking no hard questions, or because you''ve built something internally that works really well? Because if it''s the former, we often find that the pressure changes fast when a sponsor gets a measurement report from a rival property. Would it be worth 20 minutes just to benchmark where you are versus what the market expects?',
  'What would need to change internally — or externally from a sponsor — for measurement to become a priority?',
  ARRAY['Brand','Rights Holder','Club & Team'], 6),

('Just send me some information.',
  'PROCESS',
  'An email is a dead end. Offer something specific with a natural follow-up hook.',
  'Of course — what would be most useful? I could send a case study from a similar [segment] or a short video of the platform. Which would be more relevant given what you''re working on?',
  'Happy to — I just want to make sure I send you something that''s actually worth your time rather than generic material. Can I ask one quick question: is measurement something on your radar for the next 6 months, or is this more of an "interesting but not urgent" thing right now? That helps me send the right thing.',
  'Who else on your team would find this relevant — is it worth copying anyone?',
  ARRAY['Brand','Rights Holder','Agency','Club & Team'], 7),

('We''re not ready for AI yet / we don''t trust AI data.',
  'NEED',
  'AI scepticism is usually about accuracy, not technology — show the validation layer.',
  'That''s a fair concern — what specifically worries you about AI-generated data? Is it accuracy, explainability, or something else?',
  'Completely understand the scepticism — there''s a lot of noise in the AI space right now. The way Shikenso works is that our AI is trained specifically on sports broadcast footage, which means it''s not a generic large language model — it''s a specialist detection system. Every logo recognition is validated against confidence thresholds, and clients can audit any detection manually. Would it help to see a live example using footage from one of your own events?',
  'If the data was independently verified and you could audit every detection — would that change anything for you?',
  ARRAY['Brand','Rights Holder','Club & Team'], 8),

('Our IT or procurement process is too complex.',
  'PROCESS',
  'Process objections hide a champion who needs air cover — help them navigate internally.',
  'Understood — is that a dealbreaker, or is there a path if we structure it the right way? We work with enterprise procurement teams regularly.',
  'That''s actually more common than you''d think, and we''ve navigated it successfully at companies like [similar enterprise reference]. Can I ask: is the complexity mainly around security review, vendor onboarding, or contract structure? Because we have a standard data processing agreement, SOC 2 documentation, and a flexible contract structure that tends to make IT and legal sign-off straightforward. Who would be the right person to loop in on the technical side?',
  'If I prepared a one-pager for your IT or procurement team covering security, data handling, and GDPR compliance, would that help move things forward?',
  ARRAY['Brand','Agency'], 9),

('You''re too expensive / we can''t justify the cost.',
  'BUDGET',
  'Price objections are almost always value objections in disguise.',
  'Fair point — what would the right price look like for you? I ask because most teams find the ROI conversation changes once we put numbers to what they''re currently spending on manual work.',
  'I appreciate the directness. Can I ask — is it that the absolute number is outside budget, or that you''re not sure the return would justify it? Because those are very different. If it''s the return question, I''d love to walk through our ROI calculator — it''s specifically designed for teams to show what the platform would need to deliver to pay for itself. Most teams are surprised by how quickly it adds up when you factor in analyst hours saved and the value of a single retained sponsorship.',
  'If you could quantify what one retained sponsor or one new deal won through better data would be worth, what number would that be?',
  ARRAY['Brand','Rights Holder','Agency','Club & Team'], 10),

('We only do esports / we''re focused on gaming, not traditional sports.',
  'NEED',
  'Esports is a secondary market — qualify quickly and deprioritise if no traditional sponsorship angle.',
  'Totally fair — is the esports measurement for brand sponsors, or more for your own internal analytics? We do have esports capability, though our core platform is strongest on broadcast and traditional sports.',
  'That makes sense — esports is a different world when it comes to measurement, especially on the broadcast side. Shikenso does support esports stream monitoring and social tracking. The honest answer is our platform is deepest on traditional sports broadcast, so if that''s not part of your portfolio at all, it might not be the best fit right now. Is there any crossover with traditional sports in what you''re doing, or is it purely digital/gaming?',
  'Is there any traditional sports content or broadcast component in what you''re sponsoring or tracking?',
  ARRAY['Brand','Rights Holder'], 11);

-- ─── Conversation Patterns ─────────────────────────────────────────────────────
INSERT INTO kb_conversation_patterns (pattern_name, pattern_type, description, steps, example_script, sort_order) VALUES
('Cold Email Opening Framework', 'OPENING',
  'How to open a cold email with a signal-aware hook that earns a reply.',
  ARRAY[
    '1. HOOK: Reference a specific, recent, public signal about them (sponsorship announcement, event, renewal, hiring)',
    '2. RELEVANCE: One sentence connecting the signal to the problem Shikenso solves',
    '3. PROOF: One social proof reference (similar company, outcome)',
    '4. CTA: Soft, specific ask — 20-minute call, not a demo'
  ],
  E'Subject: [Club name]''s [Sponsor name] renewal — how are you measuring the value?\n\nHi [First name],\n\nSaw [Club] just announced the [Sponsor] renewal — congrats on securing that. Renewal conversations always go better with data, which is why I wanted to reach out.\n\nShikenso helps clubs like yours automatically generate sponsor-facing value reports that show media exposure, reach, and benchmark comparisons — so the next renewal conversation starts with you in the driving seat.\n\n[Similar club] used this before their main sponsor renewal and came away with a 15% increase in the deal value.\n\nWorth a 20-minute call to see if it could work for you?\n\nBest,\nBenedikt',
  1),

('Discovery Call Structure', 'DISCOVERY',
  'How to run a first discovery call to qualify a lead and surface pain.',
  ARRAY[
    '1. CONTEXT (5 min): Confirm what you know — their role, their current approach to measurement',
    '2. SITUATION (10 min): Understand their sponsorship portfolio, team size, how they report today',
    '3. PAIN (10 min): Surface the measurement gap — what they can''t answer, what takes too long',
    '4. IMPACT (5 min): Quantify the cost of the pain (time, deals lost, sponsor dissatisfaction)',
    '5. CLOSE (5 min): Agree next step — platform demo, ROI calc, or proposal'
  ],
  E'Opening: "Before I walk you through anything on our side, I''d love to understand how you''re currently set up. Can you tell me — how does sponsorship measurement work for you today?"\n\nSituation: "How many active sponsorships are you managing? And when a sponsor asks for a performance report, what does that process look like for your team?"\n\nPain: "What''s the part of that process that takes the most time or causes the most headaches?"\n\nImpact: "If you could eliminate that bottleneck — what would that mean for your team, or for a sponsor renewal conversation?"\n\nClose: "Based on what you''ve described, I think there are two or three specific things we could show you that would be directly relevant. Would a 30-minute demo focusing on [their specific pain] be useful as a next step?"',
  2),

('Objection Handling Sequence', 'OBJECTION',
  'Universal framework for handling any objection without becoming defensive.',
  ARRAY[
    '1. ACKNOWLEDGE: Validate the objection without agreeing it''s a blocker ("Completely fair...")',
    '2. CLARIFY: Ask one question to understand the real objection beneath the surface',
    '3. REFRAME: Shift from the objection to the outcome they care about',
    '4. EVIDENCE: One short proof point or analogy (not a case study dump)',
    '5. CHECK: "Does that make sense?" or "Is that closer to your concern?" — never steamroll'
  ],
  E'Example — "We already use a tool":\n\n"Completely fair — I wouldn''t expect you to switch without a good reason. Can I ask: are you getting live data, or is it still a day or two behind after an event? [Clarify]\n\nThe reason I ask is that most tools require a lot of manual setup and still have a reporting lag. What we''ve built is specifically designed so that you don''t need an analyst to run it — the reports generate themselves. [Reframe + Evidence]\n\nI''m not asking you to switch today — I''d just love to show you a side-by-side comparison. If what you have is working perfectly, we''ll part as friends. Does that feel like a fair ask? [Check]"',
  3),

('Qualification & Handoff Pattern', 'CLOSING',
  'How to qualify a lead before handing off to AE, and what to capture in the handoff brief.',
  ARRAY[
    '1. BANT CHECK: Budget confirmed or implied? Authority — are they the decision maker? Need — clear pain identified? Timeline — realistic buying window?',
    '2. CHAMPION: Is this person motivated to push it internally, or are they just curious?',
    '3. NEXT STEP LOCKED: Never leave without a specific next action with a date',
    '4. HANDOFF BRIEF: Write a 3-paragraph brief for the AE covering (a) how the lead was surfaced, (b) what they said, (c) recommended opening angle and proof point to lead with'
  ],
  E'Qualification check questions:\n- "If this made sense after the demo, is this something you''d be able to move on in [quarter], or would it go into next year''s budget?"\n- "Would you be the main decision maker on this, or would others need to be involved?"\n- "On a scale of 1–10, how high a priority is solving the measurement problem for you right now?"\n\nHandoff brief template:\n"[Lead name] at [Company] — surfaced via [source/signal]. They [what they said about their pain in their own words]. They are [BANT status]. Recommended opening: lead with [framing rule] angle, reference [specific proof point]. Watch out for [objection or competitor if mentioned]."',
  4);

