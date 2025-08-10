#!/usr/bin/env tsx

/**
 * Integration Test Script
 * Tests the frontend-backend API integration
 */

import { projectService, taskService, sprintService } from '../src/lib/api';

async function testProjectAPI() {
  console.log('🧪 Testing Project API...');
  
  try {
    // Test getting projects
    const projects = await projectService.getProjects();
    console.log('✅ Projects fetched:', projects.length);
    
    // Test creating a project
    const testProject = {
      name: 'Test Integration Project',
      description: 'Testing frontend-backend integration',
      status: 'planning' as const,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      color: 'bg-blue-500'
    };
    
    const createdProject = await projectService.createProject(testProject);
    console.log('✅ Project created:', createdProject.id);
    
    // Test updating the project
    const updatedProject = await projectService.updateProject(createdProject.id, {
      description: 'Updated description for integration test'
    });
    console.log('✅ Project updated:', updatedProject.name);
    
    // Test deleting the project
    await projectService.deleteProject(createdProject.id);
    console.log('✅ Project deleted');
    
  } catch (error) {
    console.error('❌ Project API test failed:', error);
    throw error;
  }
}

async function testSprintAPI() {
  console.log('🧪 Testing Sprint API...');
  
  try {
    // Create a test project first
    const testProject = await projectService.createProject({
      name: 'Sprint Test Project',
      description: 'Testing sprint API',
      status: 'active',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      color: 'bg-green-500'
    });
    
    // Test creating a sprint
    const testSprint = {
      name: 'Test Sprint',
      goal: 'Testing sprint integration',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'planning' as const,
      capacity: 40
    };
    
    const createdSprint = await sprintService.createSprint(testProject.id, testSprint);
    console.log('✅ Sprint created:', createdSprint.id);
    
    // Test getting sprints for project
    const sprints = await sprintService.getSprints(testProject.id);
    console.log('✅ Sprints fetched:', sprints.length);
    
    // Test starting sprint
    const startedSprint = await sprintService.startSprint(createdSprint.id);
    console.log('✅ Sprint started:', startedSprint.status);
    
    // Clean up
    await sprintService.deleteSprint(createdSprint.id);
    await projectService.deleteProject(testProject.id);
    console.log('✅ Sprint test cleanup complete');
    
  } catch (error) {
    console.error('❌ Sprint API test failed:', error);
    throw error;
  }
}

async function testTaskAPI() {
  console.log('🧪 Testing Task API...');
  
  try {
    // Create test project and sprint
    const testProject = await projectService.createProject({
      name: 'Task Test Project',
      description: 'Testing task API',
      status: 'active',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      color: 'bg-purple-500'
    });
    
    const testSprint = await sprintService.createSprint(testProject.id, {
      name: 'Task Test Sprint',
      goal: 'Testing task integration',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'active',
      capacity: 40
    });
    
    // Test creating a task
    const testTask = {
      title: 'Test Task',
      description: 'Testing task integration',
      status: 'todo' as const,
      priority: 'medium' as const,
      story_point: 5,
      sprintId: testSprint.id
    };
    
    const createdTask = await taskService.createTask(testTask);
    console.log('✅ Task created:', createdTask.id);
    
    // Test getting tasks
    const tasks = await taskService.getTasksBySprint(testSprint.id);
    console.log('✅ Tasks fetched:', tasks.length);
    
    // Test updating task status
    const updatedTask = await taskService.updateTaskStatus(createdTask.id, 'in_progress');
    console.log('✅ Task status updated:', updatedTask.status);
    
    // Clean up
    await taskService.deleteTask(createdTask.id);
    await sprintService.deleteSprint(testSprint.id);
    await projectService.deleteProject(testProject.id);
    console.log('✅ Task test cleanup complete');
    
  } catch (error) {
    console.error('❌ Task API test failed:', error);
    throw error;
  }
}

async function testAPIHealthCheck() {
  console.log('🏥 Testing API Health...');
  
  try {
    const response = await fetch('http://localhost:8000/health');
    if (response.ok) {
      console.log('✅ Backend is healthy');
    } else {
      throw new Error(`Backend health check failed: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Backend health check failed:', error);
    throw error;
  }
}

async function runIntegrationTests() {
  console.log('🚀 Starting Frontend-Backend Integration Tests...\n');
  
  try {
    await testAPIHealthCheck();
    await testProjectAPI();
    await testSprintAPI();
    await testTaskAPI();
    
    console.log('\n🎉 All integration tests passed!');
    console.log('✅ Frontend-Backend integration is working correctly');
    
  } catch (error) {
    console.error('\n💥 Integration tests failed:', error);
    console.log('\n🔍 Troubleshooting tips:');
    console.log('1. Make sure the backend server is running on http://localhost:8000');
    console.log('2. Check that the database is connected and migrations are applied');
    console.log('3. Verify the API endpoints are accessible');
    console.log('4. Check network connectivity and CORS settings');
    
    process.exit(1);
  }
}

if (require.main === module) {
  runIntegrationTests();
}

export { runIntegrationTests };
