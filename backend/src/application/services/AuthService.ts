import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { PrismaUserRepository } from '../../infrastructure/persistence/repositories/PrismaUserRepository';
import { LoginDto } from '../dtos/auth/LoginDto';
import { RegisterUserDto } from '../dtos/auth/RegisterUserDto';
import { Result } from '../../shared/types/common.types';
import { AuthResponse } from '../../shared/types/auth.types';
import config from '../../config/index';
import { User } from '../../domain/entities/User';

export class AuthService {
  constructor(private userRepository: PrismaUserRepository) {}

  async register(dto: RegisterUserDto): Promise<Result<AuthResponse>> {
    try {
      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(dto.email);
      if (existingUser) {
        return {
          isSuccess: false,
          error: 'Email already registered'
        };
      }
      // Create new user
      const user = await this.userRepository.create(dto);
      // Generate token
      const token = this.generateToken(user);
      return {
        isSuccess: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          }
        }
      };
    } catch (error) {
      return {
        isSuccess: false,
        error: 'Failed to register user'
      };
    }
  }

  async login(dto: LoginDto): Promise<Result<AuthResponse>> {
    try {
      // Find user by email
      const user = await this.userRepository.findByEmail(dto.email);
      if (!user) {
        return {
          isSuccess: false,
          error: 'User with given email does not exist'
        };
      }
      // Verify password
      const isPasswordValid = await bcrypt.compare(dto.password, user.password);
      if (!isPasswordValid) {
        return {
          isSuccess: false,
          error: 'Invalid Password'
        };
      }
      // Generate token
      const token = this.generateToken(user);
      return {
        isSuccess: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          }
        }
      };
    } catch (error) {
      return {
        isSuccess: false,
        error: 'Failed to login'
      };
    }
  }

  private generateToken(user: User): string {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  }

}
