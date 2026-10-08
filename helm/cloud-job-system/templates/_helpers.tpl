{{/* Étiquettes communes à toutes les ressources */}}
{{- define "cjs.labels" -}}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/* Sécurité du pod : jamais en root */}}
{{- define "cjs.podSecurityContext" -}}
runAsNonRoot: true
runAsUser: 1000
runAsGroup: 1000
seccompProfile:
  type: RuntimeDefault
{{- end }}

{{/* Sécurité du conteneur : aucun privilège supplémentaire */}}
{{- define "cjs.containerSecurityContext" -}}
allowPrivilegeEscalation: false
capabilities:
  drop:
    - ALL
{{- end }}

{{/* Variable DATABASE_URL, lue dans le secret Kubernetes */}}
{{- define "cjs.databaseEnv" -}}
- name: DATABASE_URL
  valueFrom:
    secretKeyRef:
      name: {{ .Values.secret.name }}
      key: DATABASE_URL
{{- end }}

{{/* Adresse complète d'une image : registry/dépôt:tag */}}
{{- define "cjs.image" -}}
{{- $root := index . 0 -}}
{{- $svc := index . 1 -}}
{{- printf "%s/%s:%s" (required "image.registry est obligatoire (--set image.registry=...)" $root.Values.image.registry) $svc.repository (required "le tag de l'image est obligatoire" $svc.tag) -}}
{{- end }}
