import { blogPosts } from "../db/schema/index.js";
import { db } from "../db/index.js";

const posts = [
  {
    title: "AI Alignment Automation: Ketika Claude Meneliti Dirinya Sendiri",
    slug: "ai-alignment-automation-claude-meneliti-dirinya-sendiri",
    description:
      "Anthropic menggunakan Claude untuk riset alignment dan hasilnya mengalahkan peneliti manusia. Apa implikasinya bagi masa depan AI safety?",
    meta: "5 min read",
    published: true,
    publishedAt: new Date("2026-05-13"),
    content: `## Latar Belakang

Mei 2026 menjadi bulan yang signifikan untuk AI safety. Anthropic mengumumkan bahwa mereka menggunakan Claude — model AI mereka sendiri — untuk mengerjakan problem riset alignment. Hasilnya? Claude mengungguli peneliti manusia dengan biaya yang jauh lebih rendah.

## Apa yang Terjadi

Anthropic merancang eksperimen di mana Claude diberi tugas-tugas alignment research yang bisa di-score secara objektif. Problem-problem ini memang dipilih secara selektif (cherry-picked) agar mudah dievaluasi, tapi hasilnya tetap mengejutkan:

- Claude menyelesaikan task lebih cepat dari tim manusia
- Biaya operasional jauh di bawah gaji peneliti
- Yang menarik: model yang *kurang capable* bisa mengawasi model yang *lebih kuat*

## Mengapa Ini Penting

### Self-Improving Safety

Jika AI bisa meneliti keselamatan dirinya sendiri, kita berpotensi mendapat feedback loop positif: model yang lebih aman menghasilkan riset yang membuat model berikutnya lebih aman lagi.

### Scalability Problem Solved?

Salah satu bottleneck terbesar di AI safety adalah kurangnya peneliti berkualitas. Jika AI bisa mengambil alih sebagian pekerjaan ini, kita bisa menskala riset alignment seiring dengan percepatan capability.

### Supervisi Asimetris

Temuan bahwa model lemah bisa mengawasi model kuat membuka paradigma baru. Ini berarti kita tidak perlu selalu memiliki model yang *lebih pintar* untuk menjaga model frontier tetap aman.

## Konteks Lebih Luas

Ini terjadi bersamaan dengan:

- **Claude Mythos** yang terlalu powerful untuk dirilis publik karena kemampuan menemukan vulnerability
- **Project Glasswing** — program terbatas di mana Mythos hanya diberikan ke korporasi tertentu
- **AI Security Institute UK** mengkonfirmasi bahwa capability cyber Mythos "represents a step up over previous frontier models"

## Implikasi untuk Developer

\`\`\`bash
# Jika kamu bekerja di AI safety, tools baru tersedia:
# Anthropic's automated alignment pipeline
# Stanford AI Index 2026 — 400+ halaman data
# Open-weight alternatives yang makin viable
\`\`\`

Sebagai engineer, ini mengubah cara kita berpikir tentang testing dan verification. Jika AI bisa menemukan vulnerability-nya sendiri, maka:

1. Security audit bisa di-automate
2. Red-teaming menjadi continuous, bukan periodic
3. Defense dan offense bergerak di kecepatan yang sama

## Kesimpulan

Kita memasuki era di mana AI bukan hanya objek riset safety — tapi juga subjeknya. Pertanyaannya bukan lagi "bisakah AI membantu alignment?" melainkan "seberapa cepat kita bisa menskala ini sebelum capability melampaui safety?"

---

*Sumber: Anthropic Research, O'Reilly Radar May 2026, Stanford AI Index 2026*`,
  },
  {
    title: "Agentic Stack 2026: Arsitektur Tiga Layer untuk AI Agents",
    slug: "agentic-stack-2026-arsitektur-tiga-layer-ai-agents",
    description:
      "Dari Claude Code Routines hingga AWS Bedrock AgentCore — bagaimana ekosistem agent berkembang menjadi stack yang terstruktur di 2026.",
    meta: "6 min read",
    published: true,
    publishedAt: new Date("2026-05-12"),
    content: `## Evolusi dari Chatbot ke Agent Stack

2026 menandai titik di mana AI agents berhenti menjadi demo dan mulai menjadi infrastruktur. Beberapa rilis besar di bulan Mei membentuk gambaran jelas: ada arsitektur standar yang sedang terbentuk.

## Tiga Layer Architecture

Ekosistem agent kini konvergen ke tiga layer:

### 1. Orchestration Layer

Layer ini mengatur *apa* yang harus dilakukan dan *kapan*. Contoh implementasi:

- **Claude Managed Agents** — harness dari Anthropic dengan memory management built-in
- **Google Scion** — open-source testbed untuk agent orchestration
- **OpenAI Workspace Agents** — shared agents yang bisa dipakai satu tim

### 2. Execution Layer

Layer ini menjalankan task. Di sinilah model bekerja:

\`\`\`typescript
// Contoh pattern: agent dengan tool calling
const agent = createAgent({
  model: "claude-opus-4.7",
  tools: [searchTool, codeTool, fileTool],
  memory: stashMemoryLayer, // open-source memory module
});

await agent.execute({
  task: "Review PR #142 and suggest improvements",
  context: workspaceContext,
});
\`\`\`

### 3. Review Layer

Layer ini memvalidasi output. Termasuk:

- Microsoft **Critique and Council** — menggunakan Claude + GPT bersama untuk cross-check
- Automated testing pipelines
- Human-in-the-loop checkpoints

## Key Releases Mei 2026

| Tool | Vendor | Fungsi |
|------|--------|--------|
| Claude Code Routines | Anthropic | Scheduled/triggered automation |
| Managed Agents | Anthropic | Full agent harness |
| Workspace Agents | OpenAI | Team-shared agents |
| Bedrock AgentCore | AWS | Agent registry + deployment |
| Stash | Open Source | Pluggable memory layer |
| Scion | Google | Orchestration testbed |

## Anthropic sebagai "AWS of Agentic AI"

Anthropic secara agresif memposisikan diri sebagai infrastructure provider:

1. **Claude Code Routines** — package berisi prompt + repo + connectors yang jalan otomatis
2. **Managed Agents** — harness lengkap dengan memory, scheduling, dan monitoring
3. **Claude Design** — tool untuk designer yang compete dengan Figma

Pattern-nya jelas: Anthropic tidak hanya menjual model, tapi menjual *platform* untuk menjalankan agent.

## Cursor 3: IDE Menjadi Background

Rilis Cursor 3 menarik karena membalik paradigma:

\`\`\`
Sebelum: IDE di depan, AI assist di sidebar
Sekarang: Agent orchestration di depan, IDE di background
\`\`\`

Ini bukan sekadar UI change — ini perubahan mental model. Developer tidak lagi *menulis kode yang dibantu AI*, tapi *mengorkestrasi agent yang menghasilkan kode*.

## Hidden Technical Debt

Paper "[The Hidden Technical Debt of Agentic Engineering](https://thenewstack.io/hidden-agentic-technical-debt/)" mengingatkan bahwa agent hanyalah bagian kecil dari sistem yang lebih besar. Technical debt menumpuk di:

- Connector dan integration layer
- State management antar agent
- Error handling untuk multi-step workflows
- Observability dan debugging

## Implikasi Praktis

Untuk developer yang ingin mulai membangun dengan agent stack:

1. **Pilih orchestration layer** — evaluasi trade-off antara vendor lock-in vs. capability
2. **Gunakan memory module** — Stash atau equivalent untuk state persistence
3. **Implement review layer** — jangan skip validation, terutama untuk production
4. **Monitor technical debt** — agent systems accumulate debt di tempat yang tidak terlihat

\`\`\`bash
# Quick start dengan open-source stack
pnpm add @anthropic-ai/sdk stash-memory
# atau gunakan AWS Bedrock AgentCore untuk managed solution
\`\`\`

## Kesimpulan

Agentic AI di 2026 bukan lagi tentang "model mana yang paling pintar" — tapi tentang *stack mana yang paling reliable*. Arsitektur tiga layer (orchestrate → execute → review) menjadi pattern standar, dan vendor berlomba mengisi setiap layer.

Yang menarik: interoperability antar layer masih terbuka. Belum ada yang "menang" di semua layer sekaligus. Ini peluang bagi developer untuk memilih best-of-breed di setiap level.

---

*Sumber: O'Reilly Radar May 2026, The New Stack, Anthropic Engineering Blog*`,
  },
];

async function seed() {
  console.log("Seeding 2 blog posts...");
  for (const post of posts) {
    await db.insert(blogPosts).values(post).onConflictDoNothing();
    console.log(`  ✓ ${post.title}`);
  }
  console.log("Done!");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
