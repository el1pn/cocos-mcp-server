import { PrefabTools } from '../tools/prefab-tools';

// Prefab tools test
export class PrefabToolsTest {
    private prefabTools: PrefabTools;

    constructor() {
        this.prefabTools = new PrefabTools();
    }

    async runAllTests() {
        console.log('Starting prefab tools tests...');
        
        try {
            // Test 1: Get tool list
            await this.testGetTools();
            
            // Test 2: Get prefab list
            await this.testGetPrefabList();
            
            // Test 3: Test prefab creation (mock)
            await this.testCreatePrefab();
            
            // Test 3.5: Test prefab instantiation (mock)
            await this.testInstantiatePrefab();
            
            // Test 4: Test prefab validation
            await this.testValidatePrefab();
            
            console.log('All tests completed!');
        } catch (error) {
            console.error('Error during testing:', error);
        }
    }

    private async testGetTools() {
        console.log('Test 1: Get tool list');
        const tools = this.prefabTools.getTools();
        console.log(`Found ${tools.length} tools:`);
        tools.forEach(tool => {
            console.log(`  - ${tool.name}: ${tool.description}`);
        });
        console.log('Test 1 complete\n');
    }

    private async testGetPrefabList() {
        console.log('Test 2: Get prefab list');
        try {
            const result = await this.prefabTools.execute('get_prefab_list', { folder: 'db://assets' });
            if (result.success) {
                console.log(`Found ${result.data?.length || 0} prefabs`);
                if (result.data && result.data.length > 0) {
                    result.data.slice(0, 3).forEach((prefab: any) => {
                        console.log(`  - ${prefab.name}: ${prefab.path}`);
                    });
                }
            } else {
                console.log('Failed to get prefab list:', result.error);
            }
        } catch (error) {
            console.log('Error getting prefab list:', error);
        }
        console.log('Test 2 complete\n');
    }

    private async testCreatePrefab() {
        console.log('Test 3: Test prefab creation (mock)');
        try {
            // Mock prefab creation
            const mockArgs = {
                nodeUuid: 'mock-node-uuid',
                savePath: 'db://assets/test',
                prefabName: 'TestPrefab'
            };
            
            const result = await this.prefabTools.execute('create_prefab', mockArgs);
            console.log('Create prefab result:', result);
        } catch (error) {
            console.log('Error creating prefab:', error);
        }
        console.log('Test 3 complete\n');
    }

    private async testInstantiatePrefab() {
        console.log('Test 3.5: Test prefab instantiation (mock)');
        try {
            // Mock prefab instantiation
            const mockArgs = {
                prefabPath: 'db://assets/prefabs/TestPrefab.prefab',
                parentUuid: 'canvas-uuid',
                position: { x: 100, y: 200, z: 0 }
            };
            
            const result = await this.prefabTools.execute('instantiate_prefab', mockArgs);
            console.log('Instantiate prefab result:', result);
            
            // Test API parameter construction
            this.testCreateNodeAPIParams();
        } catch (error) {
            console.log('Error instantiating prefab:', error);
        }
        console.log('Test 3.5 complete\n');
    }

    private testCreateNodeAPIParams() {
        console.log('Testing create-node API parameter construction...');
        
        // Mock assetUuid
        const assetUuid = 'mock-prefab-uuid';
        
        // Test basic parameters
        const basicOptions = {
            assetUuid: assetUuid,
            name: 'TestPrefabInstance'
        };
        console.log('Basic options:', basicOptions);
        
        // Test with parent node parameters
        const withParentOptions = {
            ...basicOptions,
            parent: 'parent-node-uuid'
        };
        console.log('With parent options:', withParentOptions);
        
        // Test with position parameters
        const withPositionOptions = {
            ...basicOptions,
            dump: {
                position: { x: 100, y: 200, z: 0 }
            }
        };
        console.log('With position options:', withPositionOptions);
        
        // Test full parameters
        const fullOptions = {
            assetUuid: assetUuid,
            name: 'TestPrefabInstance',
            parent: 'parent-node-uuid',
            dump: {
                position: { x: 100, y: 200, z: 0 }
            },
            keepWorldTransform: false,
            unlinkPrefab: false
        };
        console.log('Full options:', fullOptions);
    }

    private async testValidatePrefab() {
        console.log('Test 4: Test prefab validation');
        try {
            // Test validating a non-existent prefab
            const result = await this.prefabTools.execute('validate_prefab', { 
                prefabPath: 'db://assets/nonexistent.prefab' 
            });
            console.log('Validate prefab result:', result);
        } catch (error) {
            console.log('Error validating prefab:', error);
        }
        console.log('Test 4 complete\n');
    }

    // Test prefab data structure generation
    testPrefabDataGeneration() {
        console.log('Testing prefab data structure generation...');
        
        const mockNodeData = {
            name: 'TestNode',
            position: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            active: true,
            children: [],
            components: [
                {
                    type: 'cc.UITransform',
                    enabled: true,
                    properties: {
                        _contentSize: { width: 100, height: 100 },
                        _anchorPoint: { x: 0.5, y: 0.5 }
                    }
                }
            ]
        };

        const prefabUuid = this.prefabTools['generateUUID']();
        const prefabData = this.prefabTools['createPrefabData'](mockNodeData, 'TestPrefab', prefabUuid);
        
        console.log('Generated prefab data structure:');
        console.log(JSON.stringify(prefabData, null, 2));
        
        // Validate data structure
        const validationResult = this.prefabTools['validatePrefabFormat'](prefabData);
        console.log('Validation result:', validationResult);
        
        console.log('Prefab data structure generation test complete\n');
    }

    // Test UUID generation
    testUUIDGeneration() {
        console.log('Testing UUID generation...');
        
        const uuids = [];
        for (let i = 0; i < 5; i++) {
            const uuid = this.prefabTools['generateUUID']();
            uuids.push(uuid);
            console.log(`UUID ${i + 1}: ${uuid}`);
        }
        
        // Check UUID format
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const validUuids = uuids.filter(uuid => uuidPattern.test(uuid));
        
        console.log(`UUID format validation: ${validUuids.length}/${uuids.length} valid`);
        console.log('UUID generation test complete\n');
    }
}

// If running this file directly
if (typeof module !== 'undefined' && module.exports) {
    const test = new PrefabToolsTest();
    test.runAllTests();
    test.testPrefabDataGeneration();
    test.testUUIDGeneration();
} 