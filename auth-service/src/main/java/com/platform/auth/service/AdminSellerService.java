package com.platform.auth.service;

import com.platform.auth.entity.User;
import com.platform.auth.enums.Role;
import com.platform.auth.enums.SellerStatus;
import com.platform.auth.exception.AuthException;
import com.platform.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminSellerService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<User> listSellers(SellerStatus status) {
        if (status != null) {
            return userRepository.findByRoleAndSellerStatus(Role.SELLER, status);
        }
        return userRepository.findByRole(Role.SELLER);
    }

    @Transactional
    public void approveSeller(UUID userId) {
        User user = getSeller(userId);
        user.setSellerStatus(SellerStatus.ACTIVE);
    }

    @Transactional
    public void rejectSeller(UUID userId) {
        User user = getSeller(userId);
        user.setSellerStatus(SellerStatus.REJECTED);
    }

    private User getSeller(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AuthException("User not found", HttpStatus.NOT_FOUND));
        if (user.getRole() != Role.SELLER) {
            throw new AuthException("User is not a seller", HttpStatus.BAD_REQUEST);
        }
        return user;
    }
}
