import { useState, useMemo } from "react";
import { Search, Copy, Check } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/ScrollArea";

interface HttpStatus {
  code: number;
  name: string;
  description: string;
}

const HTTP_STATUSES: HttpStatus[] = [
  { code: 100, name: "Continue", description: "The server has received the request headers and the client should proceed to send the request body." },
  { code: 101, name: "Switching Protocols", description: "The requester has asked the server to switch protocols and the server has agreed to do so." },
  { code: 200, name: "OK", description: "Standard response for successful HTTP requests." },
  { code: 201, name: "Created", description: "The request has been fulfilled, resulting in the creation of a new resource." },
  { code: 202, name: "Accepted", description: "The request has been accepted for processing, but the processing has not been completed." },
  { code: 204, name: "No Content", description: "The server successfully processed the request and is not returning any content." },
  { code: 206, name: "Partial Content", description: "The server is delivering only part of the resource due to a range header sent by the client." },
  { code: 301, name: "Moved Permanently", description: "This and all future requests should be directed to the given URI." },
  { code: 302, name: "Found", description: "Tells the client to look at another URL. Previously 'Moved Temporarily'." },
  { code: 303, name: "See Other", description: "The response to the request can be found under another URI using the GET method." },
  { code: 304, name: "Not Modified", description: "Indicates that the resource has not been modified since the version specified by the request headers." },
  { code: 307, name: "Temporary Redirect", description: "The request should be repeated with another URI but future requests should still use the original URI." },
  { code: 308, name: "Permanent Redirect", description: "This and all future requests should be directed to the given URI." },
  { code: 400, name: "Bad Request", description: "The server cannot or will not process the request due to an apparent client error." },
  { code: 401, name: "Unauthorized", description: "Authentication is required and has failed or has not yet been provided." },
  { code: 403, name: "Forbidden", description: "The request was valid, but the server is refusing action. The user might not have the necessary permissions." },
  { code: 404, name: "Not Found", description: "The requested resource could not be found but may be available in the future." },
  { code: 405, name: "Method Not Allowed", description: "A request method is not supported for the requested resource." },
  { code: 408, name: "Request Timeout", description: "The server timed out waiting for the request." },
  { code: 409, name: "Conflict", description: "Indicates that the request could not be processed because of conflict in the current state of the resource." },
  { code: 410, name: "Gone", description: "Indicates that the resource requested is no longer available and will not be available again." },
  { code: 413, name: "Payload Too Large", description: "The request is larger than the server is willing or able to process." },
  { code: 415, name: "Unsupported Media Type", description: "The request entity has a media type which the server or resource does not support." },
  { code: 418, name: "I'm a Teapot", description: "This code was defined in 1998 as an April Fools' joke. Not expected to be implemented by actual HTTP servers." },
  { code: 422, name: "Unprocessable Entity", description: "The request was well-formed but was unable to be followed due to semantic errors." },
  { code: 429, name: "Too Many Requests", description: "The user has sent too many requests in a given amount of time (rate limiting)." },
  { code: 451, name: "Unavailable For Legal Reasons", description: "A server operator has received a legal demand to deny access to a resource." },
  { code: 500, name: "Internal Server Error", description: "A generic error message when an unexpected condition was encountered." },
  { code: 501, name: "Not Implemented", description: "The server either does not recognize the request method, or it lacks the ability to fulfill the request." },
  { code: 502, name: "Bad Gateway", description: "The server was acting as a gateway or proxy and received an invalid response from the upstream server." },
  { code: 503, name: "Service Unavailable", description: "The server is currently unavailable (overloaded or down for maintenance)." },
  { code: 504, name: "Gateway Timeout", description: "The server was acting as a gateway or proxy and did not receive a timely response from the upstream server." },
];

function getStatusColor(code: number): string {
  if (code >= 100 && code < 200) return "text-blue-400 bg-blue-500/10 border-blue-500/30";
  if (code >= 200 && code < 300) return "text-green-400 bg-green-500/10 border-green-500/30";
  if (code >= 300 && code < 400) return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
  if (code >= 400 && code < 500) return "text-orange-400 bg-orange-500/10 border-orange-500/30";
  if (code >= 500) return "text-red-400 bg-red-500/10 border-red-500/30";
  return "text-text-secondary bg-bg-secondary border-border";
}

function getStatusCategory(code: number): string {
  if (code >= 100 && code < 200) return "Informational";
  if (code >= 200 && code < 300) return "Success";
  if (code >= 300 && code < 400) return "Redirection";
  if (code >= 400 && code < 500) return "Client Error";
  if (code >= 500) return "Server Error";
  return "Unknown";
}

export function HttpStatusReference() {
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState<number | null>(null);

  const filteredStatuses = useMemo(() => {
    if (!search.trim()) return HTTP_STATUSES;
    const query = search.toLowerCase();
    return HTTP_STATUSES.filter(
      (s) =>
        s.code.toString().includes(query) ||
        s.name.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query)
    );
  }, [search]);

  const groupedStatuses = useMemo(() => {
    const groups: Record<string, HttpStatus[]> = {};
    filteredStatuses.forEach((status) => {
      const category = getStatusCategory(status.code);
      if (!groups[category]) groups[category] = [];
      groups[category].push(status);
    });
    return groups;
  }, [filteredStatuses]);

  const handleCopy = async (code: number) => {
    await navigator.clipboard.writeText(code.toString());
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="flex flex-col gap-4 h-full p-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by code, name, or description..."
          className={cn(
            "w-full pl-10 pr-4 py-2 text-sm",
            "bg-bg-primary border border-border rounded-lg",
            "placeholder:text-text-tertiary",
            "focus:outline-none focus:ring-2 focus:ring-accent/50"
          )}
        />
      </div>

      <ScrollArea className="flex-1" scrollbarVisibility="visible">
        <div className="flex flex-col gap-6">
          {Object.entries(groupedStatuses).map(([category, statuses]) => (
            <div key={category}>
              <div className="text-xs text-text-tertiary uppercase tracking-wider mb-2">
                {category} ({statuses[0].code.toString()[0]}xx)
              </div>
              <div className="flex flex-col gap-2">
                {statuses.map((status) => (
                  <div
                    key={status.code}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border group",
                      getStatusColor(status.code)
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-lg">{status.code}</span>
                      <Tooltip content={copied === status.code ? "Copied!" : "Copy code"}>
                        <IconButton
                          size="sm"
                          onClick={() => handleCopy(status.code)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {copied === status.code ? (
                            <Check className="w-3 h-3 text-green-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </IconButton>
                      </Tooltip>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{status.name}</div>
                      <div className="text-xs opacity-80 mt-1">{status.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {filteredStatuses.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-text-tertiary text-sm">
          No status codes found matching "{search}"
        </div>
      )}
    </div>
  );
}
