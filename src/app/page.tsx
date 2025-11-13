"use client";

// 导入 React 及其钩子函数
import React, { useState } from "react";

// 导入 shadcn/ui 的按钮组件
import { Button } from "@/components/ui/button";
// 导入 shadcn/ui 的卡片组件
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
// 导入 shadcn/ui 的输入框组件
import { Input } from "@/components/ui/input";
// 导入 shadcn/ui 的标签组件
import { Label } from "@/components/ui/label";
// 导入 shadcn/ui 的滚动区域组件
import { ScrollArea } from "@/components/ui/scroll-area";
// 导入 shadcn/ui 的分割线组件
import { Separator } from "@/components/ui/separator";
// 从 sonner 中导入全局提示组件和提示函数
import { Toaster, toast } from "sonner";

// 定义一个表示域名映射关系的接口
interface DomainMapping {
  // 源站域名
  source: string;
  // 代理域名
  proxy: string;
}

// 定义主页面组件
export default function Page() {
  // 定义源站域名输入框的状态
  const [sourceInput, setSourceInput] = useState("");
  // 定义代理域名输入框的状态
  const [proxyInput, setProxyInput] = useState("");
  // 定义当前所有域名映射列表的状态
  const [mappings, setMappings] = useState<DomainMapping[]>([]);

  // 定义用于校验域名格式的正则表达式
  const domainRegex =
    /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  // 定义用于处理添加映射的函数
  const handleAddMapping = () => {
    // 去除源站域名输入中的首尾空格
    const source = sourceInput.trim();
    // 去除代理域名输入中的首尾空格
    const proxy = proxyInput.trim();

    // 校验源站和代理域名是否为空
    if (!source || !proxy) {
      // 使用全局提示提醒用户输入完整的域名信息
      toast.error("请输入源站域名和代理域名");
      // 结束该函数执行
      return;
    }

    // 校验源站域名格式是否符合要求
    if (!domainRegex.test(source)) {
      // 提示用户源站域名格式不正确
      toast.error("源站域名格式不正确");
      // 结束该函数执行
      return;
    }

    // 校验代理域名格式是否符合要求
    if (!domainRegex.test(proxy)) {
      // 提示用户代理域名格式不正确
      toast.error("代理域名格式不正确");
      // 结束该函数执行
      return;
    }

    // 检查当前映射列表中是否已存在相同源站域名
    if (mappings.some((m) => m.source === source)) {
      // 提示用户该源站域名已存在
      toast.error("该源站域名已存在");
      // 结束该函数执行
      return;
    }

    // 构造一个新的域名映射对象
    const newMapping: DomainMapping = { source, proxy };

    // 将新的映射追加到映射列表的末尾
    setMappings((prev) => [...prev, newMapping]);

    // 清空源站域名输入框的内容
    setSourceInput("");
    // 清空代理域名输入框的内容
    setProxyInput("");

    // 提示用户添加映射成功
    toast.success("已添加域名映射");
  };

  // 定义用于删除指定索引映射的函数
  const handleDeleteMapping = (index: number) => {
    // 根据索引过滤掉对应映射项
    setMappings((prev) => prev.filter((_, i) => i !== index));
    // 提示用户删除成功
    toast.success("已删除映射");
  };

  // 定义用于将指定索引映射上移一位的函数
  const handleMoveUp = (index: number) => {
    // 当索引为 0 时无法继续上移
    if (index === 0) {
      // 直接结束函数执行
      return;
    }
    // 创建当前映射列表的浅拷贝
    const next = [...mappings];
    // 交换当前项与上一项的位置
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    // 使用新的顺序更新映射列表状态
    setMappings(next);
  };

  // 定义用于将指定索引映射下移一位的函数
  const handleMoveDown = (index: number) => {
    // 当索引已经是最后一项时无法继续下移
    if (index === mappings.length - 1) {
      // 直接结束函数执行
      return;
    }
    // 创建当前映射列表的浅拷贝
    const next = [...mappings];
    // 交换当前项与下一项的位置
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    // 使用新的顺序更新映射列表状态
    setMappings(next);
  };

  // 定义一个工具函数用于在正则表达式中转义域名中的点号
  const escapeDomainForRegex = (domain: string): string => {
    // 将普通点号替换成正则表达式中的转义点号
    return domain.replace(/\./g, "\\.");
  };

  // 定义一个函数用于生成单个映射对应的 Nginx 配置内容
  const generateConfigForMapping = (mapping: DomainMapping): string => {
    // 从映射对象中获取源站域名
    const source = mapping.source;
    // 从映射对象中获取代理域名
    const proxy = mapping.proxy;
    // 为正则表达式转义源站域名中的点号
    const escapedSource = escapeDomainForRegex(source);
    // 创建一个字符串数组用于依次存放每一行配置文本
    const lines: string[] = [];

    // 定义辅助函数用于添加一行注释和对应配置行
    const addLine = (comment: string, line?: string) => {
      // 先添加一行注释说明
      lines.push(`# ${comment}`);
      // 如果存在具体配置行则继续添加
      if (line) {
        lines.push(line);
      }
    };

    // 为 location 行添加注释和配置
    addLine("匹配当前代理域名下的所有请求路径", "location ^~ / {");

    // 为 proxy_pass 行添加注释说明和配置
    addLine("将请求转发到源站的 HTTPS 地址", `    proxy_pass https://${source};`);

    // 为 Host 头设置添加注释和配置
    addLine("将 Host 头设置为源站域名", `    proxy_set_header Host ${source};`);

    // 为 User-Agent 设置添加注释和配置
    addLine(
      "为上游请求设置常见浏览器 User-Agent",
      '    proxy_set_header User-Agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36";'
    );

    // 为 Referer 设置添加注释和配置
    addLine("设置 Referer 头为源站首页地址", `    proxy_set_header Referer "https://${source}/";`);

    // 为 Origin 设置添加注释和配置
    addLine("设置 Origin 头为源站域名", `    proxy_set_header Origin "https://${source}";`);

    // 为 X-Real-IP 头添加注释和配置
    addLine("传递客户端的真实 IP 地址", "    proxy_set_header X-Real-IP $remote_addr;");

    // 为 X-Forwarded-For 头添加注释和配置
    addLine("在 X-Forwarded-For 中追加客户端 IP", "    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;");

    // 为 X-Forwarded-Proto 头添加注释和配置
    addLine("告知上游客户端使用的原始协议", "    proxy_set_header X-Forwarded-Proto $scheme;");

    // 为 Cookie 转发添加注释和配置
    addLine("将客户端 Cookie 原样转发给上游", "    proxy_set_header Cookie $http_cookie;");

    // 为 Upgrade 头添加注释和配置
    addLine("允许升级为 WebSocket 等协议", "    proxy_set_header Upgrade $http_upgrade;");

    // 为 Connection 头添加注释和配置
    addLine("传递连接升级所需的 Connection 头", "    proxy_set_header Connection $http_connection;");

    // 为 Accept-Encoding 头添加注释和配置
    addLine("关闭上游响应内容压缩以便进行替换", '    proxy_set_header Accept-Encoding "";');

    // 为 Accept 头添加注释和配置
    addLine(
      "为上游请求设置常见的 Accept 类型",
      '    proxy_set_header Accept "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8";'
    );

    // 为 Accept-Language 头添加注释和配置
    addLine("为上游请求设置常见的语言偏好", '    proxy_set_header Accept-Language "zh-CN,zh;q=0.9,en;q=0.8";');

    // 为 HTTP 版本设置添加注释和配置
    addLine("使用 HTTP/1.1 与上游建立连接", "    proxy_http_version 1.1;");

    // 为 proxy_buffer_size 设置添加注释和配置
    addLine("设置单个代理缓冲区的大小", "    proxy_buffer_size 256k;");

    // 为 proxy_buffers 设置添加注释和配置
    addLine("设置代理缓冲区的数量和大小", "    proxy_buffers 8 256k;");

    // 为 proxy_busy_buffers_size 设置添加注释和配置
    addLine("设置代理忙碌缓冲区的大小", "    proxy_busy_buffers_size 256k;");

    // 为 proxy_ssl_server_name 设置添加注释和配置
    addLine("为上游连接启用 SNI 支持", "    proxy_ssl_server_name on;");

    // 为 proxy_ssl_name 设置添加注释和配置
    addLine("指定用于 SNI 的上游主机名", `    proxy_ssl_name ${source};`);

    // 为 proxy_ssl_verify 设置添加注释和配置
    addLine("关闭上游证书校验（按需可改为开启）", "    proxy_ssl_verify off;");

    // 为 proxy_redirect 设置添加注释和配置
    addLine(
      "将上游返回的重定向地址中的源站域名改写为代理域名",
      `    proxy_redirect ~^https://${escapedSource}(.*)$ https://${proxy}$1;`
    );

    // 为 sub_filter 源站域名替换添加注释和配置
    addLine("在 HTML 内容中将源站域名替换为代理域名", `    sub_filter '${source}' '${proxy}';`);

    // 为 sub_filter 双斜杠写法替换添加注释和配置
    addLine(
      "在 HTML 内容中将以 // 开头的源站域名替换为代理域名",
      `    sub_filter "//${source}" "//${proxy}";`
    );

    // 为 sub_filter_once 设置添加注释和配置
    addLine("对匹配到的所有内容执行替换而非仅第一次", "    sub_filter_once off;");

    // 为 sub_filter_types 设置添加注释和配置
    addLine("仅对 HTML 类型的响应内容执行替换", "    sub_filter_types text/html;");

    // 为 proxy_cookie_domain 源站域名改写添加注释和配置
    addLine("将 Set-Cookie 中的源站域名改写为当前代理域名", `    proxy_cookie_domain ${source} $host;`);

    // 为 proxy_cookie_domain 带点源站域名改写添加注释和配置
    addLine(
      "将 Set-Cookie 中带点前缀的源站域名改写为当前代理域名",
      `    proxy_cookie_domain .${source} .$host;`
    );

    // 为 proxy_cookie_path 设置添加注释和配置
    addLine("保持 Cookie 路径为根路径", "    proxy_cookie_path / /;");

    // 为 proxy_hide_header Server 设置添加注释和配置
    addLine("隐藏后端返回的 Server 头信息", "    proxy_hide_header Server;");

    // 为 proxy_hide_header Content-Security-Policy 设置添加注释和配置
    addLine("隐藏后端返回的 Content-Security-Policy 头", "    proxy_hide_header Content-Security-Policy;");

    // 为 proxy_hide_header Content-Security-Policy-Report-Only 设置添加注释和配置
    addLine(
      "隐藏后端返回的 Content-Security-Policy-Report-Only 头",
      "    proxy_hide_header Content-Security-Policy-Report-Only;"
    );

    // 为 proxy_hide_header X-Frame-Options 设置添加注释和配置
    addLine("隐藏后端返回的 X-Frame-Options 头", "    proxy_hide_header X-Frame-Options;");

    // 为 proxy_hide_header X-Content-Type-Options 设置添加注释和配置
    addLine(
      "隐藏后端返回的 X-Content-Type-Options 头",
      "    proxy_hide_header X-Content-Type-Options;"
    );

    // 为 proxy_hide_header Referrer-Policy 设置添加注释和配置
    addLine("隐藏后端返回的 Referrer-Policy 头", "    proxy_hide_header Referrer-Policy;");

    // 为 proxy_hide_header Permissions-Policy 设置添加注释和配置
    addLine("隐藏后端返回的 Permissions-Policy 头", "    proxy_hide_header Permissions-Policy;");

    // 为 proxy_hide_header Strict-Transport-Security 设置添加注释和配置
    addLine(
      "隐藏后端返回的 Strict-Transport-Security 头",
      "    proxy_hide_header Strict-Transport-Security;"
    );

    // 为 proxy_hide_header Cross-Origin-Embedder-Policy 设置添加注释和配置
    addLine(
      "隐藏后端返回的 Cross-Origin-Embedder-Policy 头",
      "    proxy_hide_header Cross-Origin-Embedder-Policy;"
    );

    // 为 proxy_hide_header Cross-Origin-Opener-Policy 设置添加注释和配置
    addLine(
      "隐藏后端返回的 Cross-Origin-Opener-Policy 头",
      "    proxy_hide_header Cross-Origin-Opener-Policy;"
    );

    // 为 proxy_hide_header Cross-Origin-Resource-Policy 设置添加注释和配置
    addLine(
      "隐藏后端返回的 Cross-Origin-Resource-Policy 头",
      "    proxy_hide_header Cross-Origin-Resource-Policy;"
    );

    // 为 proxy_hide_header Via 设置添加注释和配置
    addLine("隐藏中间代理链路信息头 Via", "    proxy_hide_header Via;");

    // 为 proxy_hide_header X-Powered-By 设置添加注释和配置
    addLine("隐藏后端技术栈头 X-Powered-By", "    proxy_hide_header X-Powered-By;");

    // 为 proxy_hide_header CF-RAY 设置添加注释和配置
    addLine("隐藏 Cloudflare 提供的 CF-RAY 头", "    proxy_hide_header CF-RAY;");

    // 为 proxy_hide_header CF-Cache-Status 设置添加注释和配置
    addLine("隐藏 Cloudflare 提供的 CF-Cache-Status 头", "    proxy_hide_header CF-Cache-Status;");

    // 为 proxy_hide_header X-XSS-Protection 设置添加注释和配置
    addLine("隐藏旧版浏览器使用的 X-XSS-Protection 头", "    proxy_hide_header X-XSS-Protection;");

    // 为可选缓存配置添加示例注释和配置行
    addLine("如需自定义缓存策略可在此处启用示例配置", "    # proxy_cache_valid 200 302 10m;");
    addLine("为 404 响应设置示例缓存时间", "    # proxy_cache_valid 404 1m;");

    // 为 location 结束大括号添加注释和配置
    addLine("结束当前 location 配置块", "}");

    // 使用换行符将所有配置行拼接成一个完整字符串
    return lines.join("\n");
  };

  // 定义用于复制单个映射配置的异步函数
  const handleCopySingle = async (mapping: DomainMapping) => {
    // 调用配置生成函数获取文本内容
    const config = generateConfigForMapping(mapping);
    try {
      // 使用剪贴板 API 将配置文本写入剪贴板
      await navigator.clipboard.writeText(config);
      // 提示用户复制成功
      toast.success("已复制该映射的配置");
    } catch (error) {
      // 当浏览器不支持或复制失败时给出提示
      toast.error("复制失败，请检查浏览器权限");
    }
  };

  // 定义用于复制全部映射配置的异步函数
  const handleCopyAll = async () => {
    // 当当前没有任何映射时直接提示并结束
    if (mappings.length === 0) {
      // 提示用户当前没有可复制的配置
      toast.error("当前没有可复制的配置");
      // 结束函数执行
      return;
    }

    // 将每个映射生成的配置拼接为一个整体文本
    const allConfig = mappings.map((mapping) => generateConfigForMapping(mapping)).join("\n\n");

    try {
      // 使用剪贴板 API 将全部配置写入剪贴板
      await navigator.clipboard.writeText(allConfig);
      // 提示用户复制全部配置成功
      toast.success("已复制全部配置");
    } catch (error) {
      // 当复制失败时给出错误提示
      toast.error("复制失败，请检查浏览器权限");
    }
  };

  // 返回页面的 JSX 结构
  return (
    <main className="min-h-screen w-full px-4 py-6 md:px-8 md:py-10">
      {/* 在页面中挂载全局提示组件 */}
      <Toaster />

      {/* 使用最大宽度容器包裹整体内容 */}
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        {/* 页面标题与简单说明卡片 */}
        <Card>
          <CardHeader>
            {/* 主标题文本 */}
            <CardTitle className="text-xl md:text-2xl">
              Nginx 多 Host Location 配置生成器
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {/* 第一行说明文字 */}
            <p>根据多个源站与代理域名映射，一次性生成对应的 Nginx location 配置块。</p>
            {/* 第二行说明文字 */}
            <p>每一行指令均带有注释，并自动包含 proxy_redirect 规则与基础安全设置。</p>
          </CardContent>
        </Card>

        {/* 输入表单与全局操作按钮卡片 */}
        <Card>
          <CardHeader>
            {/* 配置输入区域标题 */}
            <CardTitle className="text-lg">添加域名映射</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 域名输入区域采用响应式网格布局 */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* 源站域名输入区域 */}
              <div className="space-y-2">
                {/* 源站域名标签 */}
                <Label htmlFor="source-domain">源站域名</Label>
                {/* 源站域名输入框 */}
                <Input
                  id="source-domain"
                  placeholder="例如：claude.ai"
                  value={sourceInput}
                  onChange={(e) => setSourceInput(e.target.value)}
                  onKeyDown={(e) => {
                    // 当按下 Enter 键时触发添加映射逻辑
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddMapping();
                    }
                  }}
                />
              </div>

              {/* 代理域名输入区域 */}
              <div className="space-y-2">
                {/* 代理域名标签 */}
                <Label htmlFor="proxy-domain">代理域名</Label>
                {/* 代理域名输入框 */}
                <Input
                  id="proxy-domain"
                  placeholder="例如：claude.hubp.de"
                  value={proxyInput}
                  onChange={(e) => setProxyInput(e.target.value)}
                  onKeyDown={(e) => {
                    // 当按下 Enter 键时触发添加映射逻辑
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddMapping();
                    }
                  }}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* 添加映射按钮区域 */}
            <Button type="button" onClick={handleAddMapping} className="w-full md:w-auto">
              添加映射
            </Button>

            {/* 复制全部配置按钮区域 */}
            <Button
              type="button"
              variant="outline"
              onClick={handleCopyAll}
              className="w-full md:w-auto"
            >
              复制全部配置
            </Button>
          </CardFooter>
        </Card>

        {/* 映射列表和配置展示区域 */}
        <section className="space-y-4">
          {/* 当尚未添加任何映射时的占位提示卡片 */}
          {mappings.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                {/* 提示没有映射 */}
                <p>当前尚未添加任何域名映射，请先在上方输入并添加。</p>
              </CardContent>
            </Card>
          )}

          {/* 当存在映射时展示映射列表和配置 */}
          {mappings.length > 0 && (
            <div className="space-y-4">
              {/* 映射数量说明与分隔线 */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                {/* 映射条数统计 */}
                <span>当前共 {mappings.length} 条域名映射</span>
              </div>

              {/* 分割线用于与列表区分 */}
              <Separator />

              {/* 使用纵向间距展示每个映射配置卡片 */}
              <div className="space-y-4">
                {mappings.map((mapping, index) => (
                  // 单个映射的卡片容器
                  <Card key={mapping.source}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                      {/* 映射基本信息区域 */}
                      <div className="flex flex-col text-sm">
                        {/* 映射序号标题 */}
                        <span className="font-medium">映射 #{index + 1}</span>
                        {/* 映射关系说明 */}
                        <span className="text-xs text-muted-foreground">
                          {mapping.source} → {mapping.proxy}
                        </span>
                      </div>

                      {/* 映射排序与删除操作按钮区域 */}
                      <div className="flex items-center gap-2">
                        {/* 上移按钮 */}
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                        >
                          {/* 使用简单文本符号表示上移 */}
                          ↑
                        </Button>
                        {/* 下移按钮 */}
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => handleMoveDown(index)}
                          disabled={index === mappings.length - 1}
                        >
                          {/* 使用简单文本符号表示下移 */}
                          ↓
                        </Button>
                        {/* 删除按钮 */}
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          onClick={() => handleDeleteMapping(index)}
                        >
                          {/* 使用简单文本符号表示删除 */}
                          ×
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent>
                      {/* 使用滚动区域展示配置文本，避免内容过长撑满页面 */}
                      <ScrollArea className="h-64 rounded-md border p-3">
                        {/* 使用 pre 元素保持配置文本的原始格式 */}
                        <pre className="whitespace-pre text-xs">
                          {generateConfigForMapping(mapping)}
                        </pre>
                      </ScrollArea>
                    </CardContent>

                    <CardFooter className="flex justify-end">
                      {/* 单个映射配置的复制按钮 */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopySingle(mapping)}
                      >
                        复制该配置
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
