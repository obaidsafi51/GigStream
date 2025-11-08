"use client";

export default function SimpleDashboardPage() {
  console.log('[SimpleDashboard] Rendering');
  
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'white', 
      color: 'black',
      padding: '20px'
    }}>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '20px' }}>
        Simple Dashboard Test
      </h1>
      <p style={{ fontSize: '18px', marginBottom: '10px' }}>
        If you can see this text, the page is rendering!
      </p>
      <div style={{ 
        background: '#f0f0f0', 
        padding: '20px', 
        borderRadius: '8px',
        marginTop: '20px'
      }}>
        <h2 style={{ fontSize: '24px', marginBottom: '10px' }}>Test Card</h2>
        <p>Balance: $1,247.89</p>
        <p>Reputation: 87</p>
        <p>Tasks Completed: 256</p>
      </div>
      <div style={{ marginTop: '20px', padding: '10px', background: '#e8f5e9', borderRadius: '4px' }}>
        <strong>✅ Success:</strong> Dashboard page is rendering correctly!
      </div>
    </div>
  );
}
