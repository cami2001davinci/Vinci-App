import bcrypt from 'bcryptjs';

const hashPassword = async () => {
  const password = '12345'; 
  const hashed = await bcrypt.hash(password, 10);
  console.log('Password hasheada:', hashed);
};

hashPassword();
