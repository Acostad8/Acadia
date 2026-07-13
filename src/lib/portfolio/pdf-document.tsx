import {
  Document,
  Image,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { Project, ProjectStatus } from "@/lib/types";
import {
  formatSemesterLabel,
  groupProjectsBySemester,
  pickTopThreePerSemester,
  type PortfolioDataset,
  type PortfolioTemplate,
} from "./data";

const STATUS_LABEL: Record<ProjectStatus, string> = {
  idea: "Idea",
  en_desarrollo: "En desarrollo",
  terminado: "Terminado",
};

const STATUS_COLOR: Record<ProjectStatus, string> = {
  idea: "#0ea5e9",
  en_desarrollo: "#f59e0b",
  terminado: "#10b981",
};

const base = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#111827",
    paddingTop: 42,
    paddingBottom: 42,
    paddingHorizontal: 44,
    lineHeight: 1.45,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  name: { fontSize: 22, fontWeight: 700, marginBottom: 2 },
  headline: { fontSize: 11, color: "#4b5563" },
  bio: { fontSize: 9.5, color: "#374151", marginTop: 6, maxWidth: 380 },
  meta: { fontSize: 9, color: "#6b7280", marginTop: 4 },
  qrBox: { alignItems: "flex-end" },
  qrImg: { width: 68, height: 68 },
  qrLabel: { fontSize: 7.5, color: "#6b7280", marginTop: 2, textAlign: "right" },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    marginBottom: 14,
  },
  semesterTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginTop: 8,
    marginBottom: 6,
    color: "#1f2937",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  project: { marginBottom: 10 },
  projectHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  projectName: { fontSize: 11, fontWeight: 700, color: "#111827" },
  statusChip: {
    fontSize: 7.5,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    color: "#ffffff",
  },
  projectMeta: { fontSize: 9, color: "#6b7280", marginBottom: 2 },
  desc: { fontSize: 9.5, color: "#374151" },
  techRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 3, gap: 4 },
  tech: {
    fontSize: 7.5,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    backgroundColor: "#eef2ff",
    color: "#4338ca",
    borderRadius: 3,
  },
  linkRow: { flexDirection: "row", marginTop: 3, gap: 8 },
  linkText: { fontSize: 8.5, color: "#4338ca" },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 44,
    right: 44,
    fontSize: 7.5,
    color: "#9ca3af",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

const academic = StyleSheet.create({
  band: {
    backgroundColor: "#1e1b4b",
    color: "#ffffff",
    marginTop: -42,
    marginHorizontal: -44,
    paddingHorizontal: 44,
    paddingTop: 32,
    paddingBottom: 22,
    marginBottom: 18,
  },
  bandName: { color: "#ffffff", fontSize: 24, fontWeight: 700 },
  bandHeadline: { color: "#c7d2fe", fontSize: 11, marginTop: 2 },
  bandMeta: { color: "#a5b4fc", fontSize: 9, marginTop: 6 },
  bandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  qrOnBand: { width: 62, height: 62, backgroundColor: "#ffffff", padding: 3, borderRadius: 4 },
});

const showcase = StyleSheet.create({
  card: {
    padding: 10,
    marginBottom: 10,
    borderLeftWidth: 3,
    backgroundColor: "#f9fafb",
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
});

function truncate(text: string | null | undefined, max: number): string {
  if (!text) return "";
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max - 1).trimEnd() + "…";
}

function subjectAccent(
  data: PortfolioDataset,
  project: Project
): string {
  const subject = project.subject_id ? data.subjectsById[project.subject_id] : null;
  return subject?.color ?? "#6366f1";
}

function ProjectRow({
  project,
  data,
  variant,
}: {
  project: Project;
  data: PortfolioDataset;
  variant: PortfolioTemplate;
}) {
  const subject = project.subject_id ? data.subjectsById[project.subject_id] : null;
  const accent = subjectAccent(data, project);
  const container =
    variant === "showcase"
      ? [base.project, showcase.card, { borderLeftColor: accent }]
      : [base.project];
  return (
    <View style={container} wrap={false}>
      <View style={base.projectHead}>
        <Text style={base.projectName}>{project.name}</Text>
        <Text
          style={[
            base.statusChip,
            { backgroundColor: STATUS_COLOR[project.status] },
          ]}
        >
          {STATUS_LABEL[project.status]}
        </Text>
      </View>
      {(subject || project.members) && (
        <Text style={base.projectMeta}>
          {[subject?.name, project.members].filter(Boolean).join(" · ")}
        </Text>
      )}
      {project.description && (
        <Text style={base.desc}>{truncate(project.description, 260)}</Text>
      )}
      {project.highlights && (
        <Text style={[base.desc, { marginTop: 3, color: "#111827" }]}>
          {truncate(project.highlights, 200)}
        </Text>
      )}
      {project.technologies.length > 0 && (
        <View style={base.techRow}>
          {project.technologies.slice(0, 10).map((tech) => (
            <Text key={tech} style={base.tech}>
              {tech}
            </Text>
          ))}
        </View>
      )}
      {(project.repo_url || project.demo_url) && (
        <View style={base.linkRow}>
          {project.repo_url && (
            <Link src={project.repo_url} style={base.linkText}>
              Repo
            </Link>
          )}
          {project.demo_url && (
            <Link src={project.demo_url} style={base.linkText}>
              Demo
            </Link>
          )}
        </View>
      )}
    </View>
  );
}

function Header({
  data,
  qrDataUrl,
  variant,
}: {
  data: PortfolioDataset;
  qrDataUrl: string | null;
  variant: PortfolioTemplate;
}) {
  const contactParts = [data.email, data.website].filter(Boolean).join("  ·  ");
  if (variant === "academic") {
    return (
      <View style={academic.band} fixed={false}>
        <View style={academic.bandRow}>
          <View>
            <Text style={academic.bandName}>{data.displayName}</Text>
            {data.headline && <Text style={academic.bandHeadline}>{data.headline}</Text>}
            {contactParts && <Text style={academic.bandMeta}>{contactParts}</Text>}
            {data.publicUrl && (
              <Text style={academic.bandMeta}>{data.publicUrl}</Text>
            )}
          </View>
          {qrDataUrl && (
            <Image src={qrDataUrl} style={academic.qrOnBand} />
          )}
        </View>
        {data.bio && (
          <Text style={[base.bio, { color: "#e0e7ff", marginTop: 10 }]}>
            {truncate(data.bio, 320)}
          </Text>
        )}
      </View>
    );
  }
  return (
    <View>
      <View style={base.headerRow}>
        <View style={{ flex: 1, paddingRight: 16 }}>
          <Text style={base.name}>{data.displayName}</Text>
          {data.headline && <Text style={base.headline}>{data.headline}</Text>}
          {contactParts && <Text style={base.meta}>{contactParts}</Text>}
          {data.publicUrl && <Text style={base.meta}>{data.publicUrl}</Text>}
          {data.bio && <Text style={base.bio}>{truncate(data.bio, 320)}</Text>}
        </View>
        {qrDataUrl && (
          <View style={base.qrBox}>
            <Image src={qrDataUrl} style={base.qrImg} />
            <Text style={base.qrLabel}>Escanea el portafolio</Text>
          </View>
        )}
      </View>
      <View style={base.divider} />
    </View>
  );
}

export function PortfolioPdf({
  data,
  template,
  onePage,
  qrDataUrl,
  generatedAt,
}: {
  data: PortfolioDataset;
  template: PortfolioTemplate;
  onePage: boolean;
  qrDataUrl: string | null;
  generatedAt: string;
}) {
  const grouped = groupProjectsBySemester(data.projects, data.semestersById);
  const groups = onePage ? pickTopThreePerSemester(grouped) : grouped;
  return (
    <Document
      title={`Portafolio · ${data.displayName}`}
      author={data.displayName}
      creator="Acadia"
      producer="Acadia"
    >
      <Page size="A4" style={base.page}>
        <Header data={data} qrDataUrl={qrDataUrl} variant={template} />
        {groups.length === 0 ? (
          <Text style={base.desc}>Sin proyectos registrados todavía.</Text>
        ) : (
          groups.map((group, index) => (
            <View key={group.semester?.id ?? `none-${index}`}>
              <Text style={base.semesterTitle}>
                {formatSemesterLabel(group.semester)}
              </Text>
              {group.projects.map((project) => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  data={data}
                  variant={template}
                />
              ))}
            </View>
          ))
        )}
        <View style={base.footer} fixed>
          <Text>Generado con Acadia · {generatedAt}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `${pageNumber}/${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
