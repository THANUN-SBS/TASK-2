import React, { useState, useEffect, useCallback } from 'react';
import {
  Layout,
  Table,
  Button,
  Input,
  Modal,
  Form,
  message,
  Typography,
  Popconfirm,
  Space,
  Spin,
  Alert
} from 'antd';
import { PlusOutlined, DeleteOutlined, PlayCircleOutlined, SearchOutlined } from '@ant-design/icons';
import axios from 'axios';

// --- Helper Functions for API Calls ---
const apiClient = axios.create({
  baseURL: '/api', // This path is proxied by vite.config.js
});

const getServers = () => apiClient.get('/servers');
const createServer = (server) => apiClient.post('/servers', server);
const deleteServer = (id) => apiClient.delete(`/servers/${id}`);
const runCommandOnServer = (id, command) => apiClient.put(`/servers/${id}/execute`, { command });
const getPodLogs = (podName) => apiClient.get(`/tasks/${podName}/logs`);
// -----------------------------------------

const { Header, Content } = Layout;
const { Title } = Typography;
const { useForm } = Form;

const App = () => {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCommandModalVisible, setIsCommandModalVisible] = useState(false);
  const [isLogsModalVisible, setIsLogsModalVisible] = useState(false);
  const [selectedServer, setSelectedServer] = useState(null);
  const [podName, setPodName] = useState('');
  const [podLogs, setPodLogs] = useState('');
  const [logsLoading, setLogsLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  const [form] = useForm();
  const [commandForm] = useForm();
  const [messageApi, contextHolder] = message.useMessage();

  const fetchServers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getServers();
      setServers(response.data);
    } catch (error) {
      messageApi.error('Failed to fetch servers.');
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  const handleCreateServer = async (values) => {
    try {
      await createServer(values);
      messageApi.success('Server created successfully!');
      setIsModalVisible(false);
      form.resetFields();
      fetchServers();
    } catch (error) {
      messageApi.error('Failed to create server.');
    }
  };

  const handleDeleteServer = async (id) => {
    try {
      await deleteServer(id);
      messageApi.success('Server deleted successfully!');
      fetchServers();
    } catch (error) {
      messageApi.error('Failed to delete server.');
    }
  };

  const handleRunCommand = async (values) => {
      if (!selectedServer) return;
      try {
        const response = await runCommandOnServer(selectedServer.id, values.command);
        const createdPodName = response.data.split(': ')[1];
        setPodName(createdPodName);
        messageApi.success(`Command sent. Pod "${createdPodName}" is being created.`);
        setIsCommandModalVisible(false);
        commandForm.resetFields();
        setIsLogsModalVisible(true);
        pollForLogs(createdPodName);
      } catch (error) {
        messageApi.error('Failed to run command.');
      }
  };

  const pollForLogs = useCallback(async (name) => {
    setLogsLoading(true);
    setPodLogs('Waiting for pod to start and generate logs...');

    const intervalId = setInterval(async () => {
      try {
        const response = await getPodLogs(name);
        if (response.data) {
          setPodLogs(response.data);
          setLogsLoading(false);
          clearInterval(intervalId);
        }
      } catch (e) {
        console.log("Polling for logs...");
      }
    }, 3000);

    setTimeout(() => {
      clearInterval(intervalId);
      if (logsLoading) {
        setLogsLoading(false);
        setPodLogs('Timed out waiting for logs.');
      }
    }, 30000);
  }, [logsLoading]);

  const columns = [
    { title: 'Name', dataIndex: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: 'ID', dataIndex: 'id' },
    { title: 'Language', dataIndex: 'language', sorter: (a, b) => a.language.localeCompare(b.language) },
    { title: 'Framework', dataIndex: 'framework', sorter: (a, b) => a.framework.localeCompare(b.framework) },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => {
              setSelectedServer(record);
              setIsCommandModalVisible(true);
            }}
          >
            Run Command
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this server?"
            onConfirm={() => handleDeleteServer(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="primary" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const filteredServers = servers.filter(server =>
    Object.values(server).some(value =>
        String(value).toLowerCase().includes(searchText.toLowerCase())
    )
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {contextHolder}
      <Header style={{ display: 'flex', alignItems: 'center', padding: '0 24px' }}>
        <Title level={3} style={{ color: 'white', margin: 0 }}>Kaiburr Server Management</Title>
      </Header>
      <Content style={{ padding: '24px' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <Input
              placeholder="Search servers..."
              prefix={<SearchOutlined />}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 400 }}
              allowClear
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
              Add New Server
            </Button>
          </div>
          <Table
            columns={columns}
            dataSource={filteredServers}
            rowKey="id"
            loading={loading}
            bordered
            pagination={{ pageSize: 8 }}
          />
        </Space>
      </Content>

      <Modal
        title="Add New Server"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        destroyOnClose
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateServer} style={{marginTop: 24}}>
          <Form.Item name="name" label="Server Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="language" label="Language" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="framework" label="Framework" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Create Server
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Run Command on ${selectedServer?.name}`}
        open={isCommandModalVisible}
        onCancel={() => setIsCommandModalVisible(false)}
        destroyOnClose
        footer={null}
      >
        <Form form={commandForm} layout="vertical" onFinish={handleRunCommand} style={{marginTop: 24}}>
          <Form.Item name="command" label="Shell Command" rules={[{ required: true, message: 'Please enter a command!' }]}>
            <Input.TextArea rows={4} placeholder='e.g., echo "Hello World!"' />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Execute
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Logs for Pod: ${podName}`}
        open={isLogsModalVisible}
        onCancel={() => setIsLogsModalVisible(false)}
        width={800}
        footer={[ <Button key="close" onClick={() => setIsLogsModalVisible(false)}>Close</Button> ]}
      >
        {logsLoading ? (
            <div style={{textAlign: 'center', padding: '40px 0'}}><Spin size="large" /></div>
        ) : (
          <Alert
            message="Command Output"
            description={<pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>{podLogs}</pre>}
            type={podLogs.startsWith('Timed out') ? 'warning' : 'info'}
            showIcon
          />
        )}
      </Modal>
    </Layout>
  );
};

export default App;