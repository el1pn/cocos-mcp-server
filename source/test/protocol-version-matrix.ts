type JsonRpcRequest = {
    jsonrpc: '2.0';
    id: number;
    method: string;
    params?: Record<string, unknown>;
};

type MatrixResult = {
    version: string;
    initializeStatus: number;
    initializeError?: string;
    responseProtocolVersion?: string | null;
    hasSession: boolean;
    toolsListStatus?: number;
    toolsCount?: number;
    toolsListError?: string;
};

const MCP_ENDPOINT = process.env.MCP_ENDPOINT || 'http://127.0.0.1:3000/mcp';
const WHITELISTED_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];

async function postJsonRpc(
    payload: JsonRpcRequest,
    headers: Record<string, string> = {}
): Promise<{ status: number; headers: Headers; body: any }> {
    const response = await fetch(MCP_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...headers
        },
        body: JSON.stringify(payload)
    });

    const text = await response.text();
    let body: any = null;
    try {
        body = JSON.parse(text);
    } catch {
        body = { raw: text };
    }

    return {
        status: response.status,
        headers: response.headers,
        body
    };
}

async function testVersion(version: string): Promise<MatrixResult> {
    const initializeRequest: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
            protocolVersion: version,
            capabilities: {},
            clientInfo: { name: 'protocol-matrix-test', version: '1.0.0' }
        }
    };

    const initializeResponse = await postJsonRpc(initializeRequest, {
        'MCP-Protocol-Version': version
    });

    const sessionId = initializeResponse.headers.get('mcp-session-id');
    const responseProtocolVersion = initializeResponse.headers.get('mcp-protocol-version');
    const result: MatrixResult = {
        version,
        initializeStatus: initializeResponse.status,
        initializeError: initializeResponse.body?.error?.message,
        responseProtocolVersion,
        hasSession: Boolean(sessionId)
    };

    if (!sessionId) {
        return result;
    }

    const toolsListRequest: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
    };
    const toolsListResponse = await postJsonRpc(toolsListRequest, {
        'Mcp-Session-Id': sessionId,
        'MCP-Protocol-Version': version
    });

    result.toolsListStatus = toolsListResponse.status;
    result.toolsListError = toolsListResponse.body?.error?.message;
    result.toolsCount = Array.isArray(toolsListResponse.body?.result?.tools)
        ? toolsListResponse.body.result.tools.length
        : undefined;

    return result;
}

async function main(): Promise<void> {
    console.log(`Testing MCP protocol matrix on: ${MCP_ENDPOINT}`);
    console.log(`Versions: ${WHITELISTED_VERSIONS.join(', ')}`);

    const results: MatrixResult[] = [];
    for (const version of WHITELISTED_VERSIONS) {
        const result = await testVersion(version);
        results.push(result);
    }

    const unsupportedVersion = '2099-01-01';
    const unsupportedResponse = await postJsonRpc(
        {
            jsonrpc: '2.0',
            id: 99,
            method: 'initialize',
            params: {
                protocolVersion: unsupportedVersion,
                capabilities: {},
                clientInfo: { name: 'protocol-matrix-test', version: '1.0.0' }
            }
        },
        { 'MCP-Protocol-Version': unsupportedVersion }
    );

    for (const row of results) {
        console.log('\n---');
        console.log(`version=${row.version}`);
        console.log(`initialize=${row.initializeStatus}${row.initializeError ? ` (${row.initializeError})` : ''}`);
        console.log(`session=${row.hasSession}, responseVersion=${row.responseProtocolVersion ?? 'none'}`);
        if (row.toolsListStatus !== undefined) {
            console.log(`tools/list=${row.toolsListStatus}${row.toolsListError ? ` (${row.toolsListError})` : ''}, tools=${row.toolsCount ?? 'n/a'}`);
        }
    }

    console.log('\n---');
    console.log(`unsupported=${unsupportedVersion}`);
    console.log(`initialize=${unsupportedResponse.status} (${unsupportedResponse.body?.error?.message || 'no error message'})`);
}

void main().catch((error) => {
    console.error('Protocol matrix test failed:', error);
    process.exit(1);
});
