require('dotenv').config();

console.log('📋 Current Database Configuration:');
console.log('   DB_HOST:', process.env.DB_HOST || 'localhost (default)');
console.log('   DB_PORT:', process.env.DB_PORT || '3306 (default)');
console.log('   DB_USER:', process.env.DB_USER || 'root (default)');
console.log('   DB_PASSWORD:', process.env.DB_PASSWORD ? '***' + process.env.DB_PASSWORD.slice(-3) : 'portes2025 (default)');
console.log('   DB_NAME:', process.env.DB_NAME || 'vuon (default)');
console.log('\n💡 Based on your database tool, you should use:');
console.log('   DB_HOST=82.25.69.143');
console.log('   DB_PORT=3306');
console.log('   DB_USER=(your username)');
console.log('   DB_PASSWORD=(your password)');
console.log('   DB_NAME=vuon');

