"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Toaster, toast } from "sonner";

interface DomainMapping {
  source: string;
  proxy: string;
}

export default function Page() {
  const [sourceInput, setSourceInput] = useState("");
  const [proxyInput, setProxyInput] = useState("");
  const [mappings, setMappings] = useState<DomainMapping[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState<"single" | "all">("single");

  const domainRegex =
    /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  const handleAddMapping = () => {
    const source = sourceInput.trim();
    const proxy = proxyInput.trim();

    if (!source || !proxy) {
      toast.error("请输入源站域名和代理域名");
      return;
    }

    if (!domainRegex.test(source)) {
      toast.error("源站域名格式不正确");
      return;
    }

    if (!domainRegex.test(proxy)) {
      toast.error("代理域名格式不正确");
      return;
    }

    if (mappings.some((m) => m.source === source)) {
      toast.error("该源站域名已存在");
      return;
    }

    const newMapping: DomainMapping = { source, proxy };
    setMappings((prev) => [...prev, newMapping]);
    setSourceInput("");
    setProxyInput("");
    setSelectedIndex(mappings.length);
    setPreviewMode("single");
    toast.success("已添加域名映射");
  };

  const handleDeleteMapping = (index: number) => {
    setMappings((prev) => prev.filter((_, i) => i !== index));
    if (selectedIndex === index) {
      setSelectedIndex(null);
    } else if (selectedIndex !== null && selectedIndex > index) {
      setSelectedIndex(selectedIndex - 1);
    }
    toast.success("已删除映射");
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const next = [...mappings];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    setMappings(next);
    if (selectedIndex === index) {
      setSelectedIndex(index - 1);
    } else if (selectedIndex === index - 1) {
      setSelectedIndex(index);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index === mappings.length - 1) return;
    const next = [...mappings];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    setMappings(next);
    if (selectedIndex === index) {
      setSelectedIndex(index + 1);
    } else if (selectedIndex === index + 1) {
      setSelectedIndex(index);
    }
  };

  const escapeDomainForRegex = (domain: string): string => {
    return domain.replace(/\./g, "\\.");
  };

  const generateConfigForMapping = (mapping: DomainMapping): string => {
    const source = mapping.source;
    const proxy = mapping.proxy;
    const escapedSource = escapeDomainForRegex(source);
    const lines: string[] = [];

    const addLine = (comment: string, line?: string) => {
      lines.push(`# ${comment}`);
      if (line) {
        lines.push(line);
      }
    };

    addLine("匹配当前代理域名下的所有请求路径", "location ^~ / {");
    addLine("将请求转发到源站的 HTTPS 地址", `    proxy_pass https://${source};`);
    addLine("将 Host 头设置为源站域名", `    proxy_set_header Host ${source};`);
    addLine(
      "为上游请求设置常见浏览器 User-Agent",
      '    proxy_set_header User-Agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36";'
    );
    addLine("设置 Referer 头为源站首页地址", `    proxy_set_header Referer "https://${source}/";`);
    addLine("设置 Origin 头为源站域名", `    proxy_set_header Origin "https://${source}";`);
    addLine("传递客户端的真实 IP 地址", "    proxy_set_header X-Real-IP $remote_addr;");
    addLine("在 X-Forwarded-For 中追加客户端 IP", "    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;");
    addLine("告知上游客户端使用的原始协议", "    proxy_set_header X-Forwarded-Proto $scheme;");
    addLine("将客户端 Cookie 原样转发给上游", "    proxy_set_header Cookie $http_cookie;");
    addLine("允许升级为 WebSocket 等协议", "    proxy_set_header Upgrade $http_upgrade;");
    addLine("传递连接升级所需的 Connection 头", "    proxy_set_header Connection $http_connection;");
    addLine("关闭上游响应内容压缩以便进行替换", '    proxy_set_header Accept-Encoding "";');
    addLine(
      "为上游请求设置常见的 Accept 类型",
      '    proxy_set_header Accept "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8";'
    );
    addLine("为上游请求设置常见的语言偏好", '    proxy_set_header Accept-Language "zh-CN,zh;q=0.9,en;q=0.8";');
    addLine("使用 HTTP/1.1 与上游建立连接", "    proxy_http_version 1.1;");
    addLine("设置单个代理缓冲区的大小", "    proxy_buffer_size 256k;");
    addLine("设置代理缓冲区的数量和大小", "    proxy_buffers 8 256k;");
    addLine("设置代理忙碌缓冲区的大小", "    proxy_busy_buffers_size 256k;");
    addLine("为上游连接启用 SNI 支持", "    proxy_ssl_server_name on;");
    addLine("指定用于 SNI 的上游主机名", `    proxy_ssl_name ${source};`);
    addLine("关闭上游证书校验（按需可改为开启）", "    proxy_ssl_verify off;");
    addLine(
      "将上游返回的重定向地址中的源站域名改写为代理域名",
      `    proxy_redirect ~^https://${escapedSource}(.*)$ https://${proxy}$1;`
    );
    addLine("在 HTML 内容中将源站域名替换为代理域名", `    sub_filter '${source}' '${proxy}';`);
    addLine(
      "在 HTML 内容中将以 // 开头的源站域名替换为代理域名",
      `    sub_filter "//${source}" "//${proxy}";`
    );
    addLine("对匹配到的所有内容执行替换而非仅第一次", "    sub_filter_once off;");
    addLine("仅对 HTML 类型的响应内容执行替换", "    sub_filter_types text/html;");
    addLine("将 Set-Cookie 中的源站域名改写为当前代理域名", `    proxy_cookie_domain ${source} $host;`);
    addLine(
      "将 Set-Cookie 中带点前缀的源站域名改写为当前代理域名",
      `    proxy_cookie_domain .${source} .$host;`
    );
    addLine("保持 Cookie 路径为根路径", "    proxy_cookie_path / /;");
    addLine("隐藏后端返回的 Server 头信息", "    proxy_hide_header Server;");
    addLine("隐藏后端返回的 Content-Security-Policy 头", "    proxy_hide_header Content-Security-Policy;");
    addLine(
      "隐藏后端返回的 Content-Security-Policy-Report-Only 头",
      "    proxy_hide_header Content-Security-Policy-Report-Only;"
    );
    addLine("隐藏后端返回的 X-Frame-Options 头", "    proxy_hide_header X-Frame-Options;");
    addLine(
      "隐藏后端返回的 X-Content-Type-Options 头",
      "    proxy_hide_header X-Content-Type-Options;"
    );
    addLine("隐藏后端返回的 Referrer-Policy 头", "    proxy_hide_header Referrer-Policy;");
    addLine("隐藏后端返回的 Permissions-Policy 头", "    proxy_hide_header Permissions-Policy;");
    addLine(
      "隐藏后端返回的 Strict-Transport-Security 头",
      "    proxy_hide_header Strict-Transport-Security;"
    );
    addLine(
      "隐藏后端返回的 Cross-Origin-Embedder-Policy 头",
      "    proxy_hide_header Cross-Origin-Embedder-Policy;"
    );
    addLine(
      "隐藏后端返回的 Cross-Origin-Opener-Policy 头",
      "    proxy_hide_header Cross-Origin-Opener-Policy;"
    );
    addLine(
      "隐藏后端返回的 Cross-Origin-Resource-Policy 头",
      "    proxy_hide_header Cross-Origin-Resource-Policy;"
    );
    addLine("隐藏中间代理链路信息头 Via", "    proxy_hide_header Via;");
    addLine("隐藏后端技术栈头 X-Powered-By", "    proxy_hide_header X-Powered-By;");
    addLine("隐藏 Cloudflare 提供的 CF-RAY 头", "    proxy_hide_header CF-RAY;");
    addLine("隐藏 Cloudflare 提供的 CF-Cache-Status 头", "    proxy_hide_header CF-Cache-Status;");
    addLine("隐藏旧版浏览器使用的 X-XSS-Protection 头", "    proxy_hide_header X-XSS-Protection;");
    addLine("如需自定义缓存策略可在此处启用示例配置", "    # proxy_cache_valid 200 302 10m;");
    addLine("为 404 响应设置示例缓存时间", "    # proxy_cache_valid 404 1m;");
    addLine("结束当前 location 配置块", "}");

    return lines.join("\n");
  };

  const handleCopySingle = async (mapping: DomainMapping) => {
    const config = generateConfigForMapping(mapping);
    try {
      await navigator.clipboard.writeText(config);
      toast.success("已复制该映射的配置");
    } catch (error) {
      toast.error("复制失败，请检查浏览器权限");
    }
  };

  const handleCopyAll = async () => {
    if (mappings.length === 0) {
      toast.error("当前没有可复制的配置");
      return;
    }
    const allConfig = mappings.map((mapping) => generateConfigForMapping(mapping)).join("\n\n");
    try {
      await navigator.clipboard.writeText(allConfig);
      toast.success("已复制全部配置");
    } catch (error) {
      toast.error("复制失败，请检查浏览器权限");
    }
  };

  const handleCopyPreview = async () => {
    if (previewMode === "single" && selectedIndex !== null) {
      await handleCopySingle(mappings[selectedIndex]);
    } else {
      await handleCopyAll();
    }
  };

  const getPreviewContent = () => {
    if (mappings.length === 0) {
      return "添加域名映射后，配置将在此处显示";
    }

    if (previewMode === "all") {
      return mappings.map((mapping) => generateConfigForMapping(mapping)).join("\n\n");
    }

    if (selectedIndex !== null && mappings[selectedIndex]) {
      return generateConfigForMapping(mappings[selectedIndex]);
    }

    return "请从左侧选择一个映射查看配置";
  };

  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-6">
      <Toaster />

      <div className="mx-auto max-w-7xl">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Nginx 多 Host Location 配置生成器</h1>
          <p className="mt-2 text-sm text-slate-600">
            根据多个源站与代理域名映射，生成结构清晰、带注释的 Nginx location 配置。右侧可以实时预览每条映射生成的配置，并按需复制单条或全部配置内容。
          </p>
        </div>

        {/* 主内容区：左右分栏 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 左侧：输入和映射列表 */}
          <div className="space-y-6">
            {/* 输入表单 */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">添加域名映射</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="source-domain">源站域名</Label>
                    <Input
                      id="source-domain"
                      placeholder="例如：claude.ai"
                      value={sourceInput}
                      onChange={(e) => setSourceInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddMapping();
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="proxy-domain">代理域名</Label>
                    <Input
                      id="proxy-domain"
                      placeholder="例如：claude.hubp.de"
                      value={proxyInput}
                      onChange={(e) => setProxyInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddMapping();
                        }
                      }}
                    />
                  </div>

                  <Button type="button" onClick={handleAddMapping} className="w-full">
                    添加映射
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 映射列表 */}
            <Card className="shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-lg">域名映射列表</CardTitle>
                {mappings.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {mappings.length} 条映射
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                {mappings.length === 0 ? (
                  <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50">
                    <p className="text-sm text-slate-500">暂无域名映射</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-2">
                      {mappings.map((mapping, index) => (
                        <div
                          key={mapping.source}
                          onClick={() => {
                            setSelectedIndex(index);
                            setPreviewMode("single");
                          }}
                          className={`group cursor-pointer rounded-lg border-2 p-3 transition-all hover:border-blue-300 hover:bg-blue-50/50 ${
                            selectedIndex === index && previewMode === "single"
                              ? "border-blue-500 bg-blue-50"
                              : "border-slate-200 bg-white"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  #{index + 1}
                                </Badge>
                                <span className="text-sm font-medium text-slate-900">{mapping.source}</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-slate-500">
                                <span>→</span>
                                <span>{mapping.proxy}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveUp(index);
                                }}
                                disabled={index === 0}
                              >
                                ↑
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveDown(index);
                                }}
                                disabled={index === mappings.length - 1}
                              >
                                ↓
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-red-600 hover:bg-red-50 hover:text-red-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteMapping(index);
                                }}
                              >
                                ×
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 右侧：配置预览 */}
          <div className="space-y-6">
            <Card className="shadow-md lg:sticky lg:top-6">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-lg">配置预览</CardTitle>
                <div className="flex items-center gap-2">
                  {mappings.length > 0 && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant={previewMode === "single" ? "default" : "outline"}
                        onClick={() => {
                          setPreviewMode("single");
                          if (selectedIndex === null && mappings.length > 0) {
                            setSelectedIndex(0);
                          }
                        }}
                      >
                        单个
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={previewMode === "all" ? "default" : "outline"}
                        onClick={() => setPreviewMode("all")}
                      >
                        全部
                      </Button>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ScrollArea className="h-[500px] rounded-lg border bg-slate-900 p-4">
                  <pre className="text-xs text-slate-100">
                    {getPreviewContent()}
                  </pre>
                </ScrollArea>

                {mappings.length > 0 && (
                  <Button type="button" onClick={handleCopyPreview} className="w-full">
                    {previewMode === "all" ? "复制全部配置" : "复制当前配置"}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
