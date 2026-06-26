"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { useI18n } from "@/i18n/i18n-context";
import { WorkflowEditor } from "@/components/workflow-editor";
import { Badge } from "@/components/ui";
import { Zap, ArrowRight, Mail, Globe, Database, Clock, AlertTriangle, Play, Pause, CheckCircle, XCircle, Edit3, Eye } from "lucide-react";

export default function WorkflowPage() {
  const { t } = useI18n();
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Editor Mode */}
        {editingId ? (
          <WorkflowEditor />
        ) : (
          <>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("workflow.title")}</h1>
            <p className="text-muted-foreground">{t("workflow.description")}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm"><Play className="mr-2 h-4 w-4" />{t("workflow.test")}</Button>
            <Button size="sm" onClick={() => setEditingId('new')}>
              <Edit3 className="mr-2 h-4 w-4" />{t("workflow.create")}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base"><Zap className="h-5 w-5 text-yellow-500" />通知工作流</CardTitle>
              <Badge variant="outline" className="gap-1"><CheckCircle className="h-3 w-3 text-green-500" />{t("common.active")}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center justify-center gap-4 py-6">
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-16 w-24 items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/5"><Play className="h-6 w-6 text-primary" /></div>
                <span className="text-xs font-medium text-muted-foreground">{t("workflow.trigger")}</span>
                <span className="text-xs text-muted-foreground">{t("workflow.trigger_on_submit")}</span>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-16 w-28 items-center justify-center rounded-lg border bg-card shadow-sm"><Mail className="h-6 w-6 text-blue-500" /></div>
                <span className="text-xs font-medium">{t("workflow.send_email")}</span>
                <span className="text-xs text-muted-foreground">通知管理员</span>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-16 w-20 items-center justify-center rounded-lg border bg-yellow-50"><AlertTriangle className="h-6 w-6 text-yellow-500" /></div>
                <span className="text-xs font-medium">{t("workflow.condition")}</span>
                <span className="text-xs text-muted-foreground">部门 = 销售</span>
              </div>
              <div className="flex flex-col items-center">
                <ArrowRight className="mb-1 h-5 w-5 text-muted-foreground" />
                <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90" />
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-16 w-28 items-center justify-center rounded-lg border bg-green-50"><Database className="h-6 w-6 text-green-500" /></div>
                <span className="text-xs font-medium">{t("workflow.update_record")}</span>
                <span className="text-xs text-green-600">如果为真</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-16 w-28 items-center justify-center rounded-lg border bg-gray-50"><Globe className="h-6 w-6 text-gray-500" /></div>
                <span className="text-xs font-medium">{t("workflow.webhook")}</span>
                <span className="text-xs text-red-500">如果为假</span>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-16 w-20 items-center justify-center rounded-lg border bg-card shadow-sm"><Clock className="h-6 w-6 text-orange-500" /></div>
                <span className="text-xs font-medium">{t("workflow.delay")}</span>
                <span className="text-xs text-muted-foreground">24 小时</span>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-16 w-28 items-center justify-center rounded-lg border bg-card shadow-sm"><Mail className="h-6 w-6 text-purple-500" /></div>
                <span className="text-xs font-medium">跟进邮件</span>
                <span className="text-xs text-muted-foreground">发送提醒</span>
              </div>
            </div>

            <div className="mt-6 border-t pt-4">
              <h3 className="mb-3 text-sm font-medium">{t("workflow.recent_executions")}</h3>
              <div className="space-y-2">
                {[
                  { status: "success", time: "2 分钟前", steps: "4/4 已完成" },
                  { status: "success", time: "15 分钟前", steps: "4/4 已完成" },
                  { status: "failed", time: "1 小时前", steps: "步骤 2 失败" },
                  { status: "success", time: "3 小时前", steps: "4/4 已完成" },
                  { status: "success", time: "5 小时前", steps: "3/4 已完成" },
                ].map((exec, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex items-center gap-3">
                      {exec.status === "success" ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                      <div><p className="text-sm font-medium">{exec.status === "success" ? t("workflow.completed") : t("workflow.failed")}</p><p className="text-xs text-muted-foreground">{exec.steps}</p></div>
                    </div>
                    <span className="text-xs text-muted-foreground">{exec.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">可用动作</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Mail, label: t("workflow.send_email"), desc: t("workflow.send_email_desc") },
                { icon: Globe, label: t("workflow.webhook"), desc: t("workflow.webhook_desc") },
                { icon: Database, label: t("workflow.update_record"), desc: t("workflow.update_record_desc") },
                { icon: Clock, label: t("workflow.delay"), desc: t("workflow.delay_desc") },
                { icon: AlertTriangle, label: t("workflow.condition"), desc: t("workflow.condition_desc") },
                { icon: Zap, label: t("workflow.slack"), desc: t("workflow.slack_desc") },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <button key={action.label} className="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:border-primary hover:bg-primary/5">
                    <div className="rounded-md bg-muted p-2"><Icon className="h-4 w-4" /></div>
                    <div><p className="text-sm font-medium">{action.label}</p><p className="text-xs text-muted-foreground">{action.desc}</p></div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
