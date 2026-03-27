declare const Editor: any;

/**
 * MCP Tool Tester - Directly test MCP tools via WebSocket
 */
export class MCPToolTester {
    private ws: WebSocket | null = null;
    private messageId = 0;
    private responseHandlers = new Map<number, (response: any) => void>();

    async connect(port: number): Promise<boolean> {
        return new Promise((resolve) => {
            try {
                this.ws = new WebSocket(`ws://localhost:${port}`);
                
                this.ws.onopen = () => {
                    console.log('WebSocket connection successful');
                    resolve(true);
                };
                
                this.ws.onerror = (error) => {
                    console.error('WebSocket connection error:', error);
                    resolve(false);
                };
                
                this.ws.onmessage = (event) => {
                    try {
                        const response = JSON.parse(event.data);
                        if (response.id && this.responseHandlers.has(response.id)) {
                            const handler = this.responseHandlers.get(response.id);
                            this.responseHandlers.delete(response.id);
                            handler?.(response);
                        }
                    } catch (error) {
                        console.error('Error processing response:', error);
                    }
                };
            } catch (error) {
                console.error('Error creating WebSocket:', error);
                resolve(false);
            }
        });
    }

    async callTool(tool: string, args: any = {}): Promise<any> {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket not connected');
        }

        return new Promise((resolve, reject) => {
            const id = ++this.messageId;
            const request = {
                jsonrpc: '2.0',
                id,
                method: 'tools/call',
                params: {
                    name: tool,
                    arguments: args
                }
            };

            const timeout = setTimeout(() => {
                this.responseHandlers.delete(id);
                reject(new Error('Request timeout'));
            }, 10000);

            this.responseHandlers.set(id, (response) => {
                clearTimeout(timeout);
                if (response.error) {
                    reject(new Error(response.error.message));
                } else {
                    resolve(response.result);
                }
            });

            this.ws!.send(JSON.stringify(request));
        });
    }

    async listTools(): Promise<any> {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket not connected');
        }

        return new Promise((resolve, reject) => {
            const id = ++this.messageId;
            const request = {
                jsonrpc: '2.0',
                id,
                method: 'tools/list'
            };

            const timeout = setTimeout(() => {
                this.responseHandlers.delete(id);
                reject(new Error('Request timeout'));
            }, 10000);

            this.responseHandlers.set(id, (response) => {
                clearTimeout(timeout);
                if (response.error) {
                    reject(new Error(response.error.message));
                } else {
                    resolve(response.result);
                }
            });

            this.ws!.send(JSON.stringify(request));
        });
    }

    async testMCPTools() {
        console.log('\n=== Testing MCP Tools (via WebSocket) ===');
        
        try {
            // 0. Get tool list
            console.log('\n0. Getting tool list...');
            const toolsList = await this.listTools();
            console.log(`Found ${toolsList.tools?.length || 0} tools:`);
            if (toolsList.tools) {
                for (const tool of toolsList.tools.slice(0, 10)) { // Only show first 10
                    console.log(`  - ${tool.name}: ${tool.description}`);
                }
                if (toolsList.tools.length > 10) {
                    console.log(`  ... and ${toolsList.tools.length - 10} more tools`);
                }
            }
            
            // 1. Test scene tools
            console.log('\n1. Testing current scene info...');
            const sceneInfo = await this.callTool('scene_get_current_scene');
            console.log('Scene info:', JSON.stringify(sceneInfo).substring(0, 100) + '...');
            
            // 2. Test scene list
            console.log('\n2. Testing scene list...');
            const sceneList = await this.callTool('scene_get_scene_list');
            console.log('Scene list:', JSON.stringify(sceneList).substring(0, 100) + '...');
            
            // 3. Test node creation
            console.log('\n3. Testing node creation...');
            const createResult = await this.callTool('node_create_node', {
                name: 'MCPTestNode_' + Date.now(),
                nodeType: 'cc.Node',
                position: { x: 0, y: 0, z: 0 }
            });
            console.log('Create node result:', createResult);
            
            // Parse create node result
            let nodeUuid: string | null = null;
            if (createResult.content && createResult.content[0] && createResult.content[0].text) {
                try {
                    const resultData = JSON.parse(createResult.content[0].text);
                    if (resultData.success && resultData.data && resultData.data.uuid) {
                        nodeUuid = resultData.data.uuid;
                        console.log('Successfully got node UUID:', nodeUuid);
                    }
                } catch (e) {
                }
            }
            
            if (nodeUuid) {
                // 4. Test node query
                console.log('\n4. Testing node query...');
                const queryResult = await this.callTool('node_get_node_info', {
                    uuid: nodeUuid
                });
                console.log('Node info:', JSON.stringify(queryResult).substring(0, 100) + '...');
                
                // 5. Test node deletion
                console.log('\n5. Testing node deletion...');
                const removeResult = await this.callTool('node_delete_node', {
                    uuid: nodeUuid
                });
                console.log('Delete result:', removeResult);
            } else {
                console.log('Unable to get node UUID from create result, trying to find by name...');
                
                // Fallback: find the just-created node by name
                const findResult = await this.callTool('node_find_node_by_name', {
                    name: 'MCPTestNode_' + Date.now()
                });
                
                if (findResult.content && findResult.content[0] && findResult.content[0].text) {
                    try {
                        const findData = JSON.parse(findResult.content[0].text);
                        if (findData.success && findData.data && findData.data.uuid) {
                            nodeUuid = findData.data.uuid;
                            console.log('Successfully got UUID by name search:', nodeUuid);
                        }
                    } catch (e) {
                    }
                }
                
                if (!nodeUuid) {
                    console.log('All methods failed to get node UUID, skipping subsequent node operation tests');
                }
            }
            
            // 6. Test project tools
            console.log('\n6. Testing project info...');
            const projectInfo = await this.callTool('project_get_project_info');
            console.log('Project info:', JSON.stringify(projectInfo).substring(0, 100) + '...');
            
            // 7. Test prefab tools
            console.log('\n7. Testing prefab list...');
            const prefabResult = await this.callTool('prefab_get_prefab_list', {
                folder: 'db://assets'
            });
            console.log('Found prefabs:', prefabResult.data?.length || 0);
            
            // 8. Test component tools
            console.log('\n8. Testing available components...');
            const componentsResult = await this.callTool('component_get_available_components');
            console.log('Available components:', JSON.stringify(componentsResult).substring(0, 100) + '...');
            
            // 9. Test debug tools
            console.log('\n9. Testing editor info...');
            const editorInfo = await this.callTool('debug_get_editor_info');
            console.log('Editor info:', JSON.stringify(editorInfo).substring(0, 100) + '...');
            
        } catch (error) {
            console.error('MCP tool test failed:', error);
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.responseHandlers.clear();
    }
}

// Export to global for testing convenience
(global as any).MCPToolTester = MCPToolTester;