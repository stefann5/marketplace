package com.platform.seller.service;

import com.platform.seller.dto.*;
import com.platform.seller.entity.SellerDocument;
import com.platform.seller.entity.SellerProfile;
import com.platform.seller.entity.SellerTheme;
import com.platform.seller.enums.SellerStatus;
import com.platform.seller.exception.SellerException;
import com.platform.seller.repository.SellerProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.text.Normalizer;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class SellerService {

    private final SellerProfileRepository profileRepository;
    private final MinioService minioService;
    private final AuthClient authClient;

    @Transactional
    public SellerProfileResponse registerPublic(String email,
                                                SellerRegistrationRequest request,
                                                List<MultipartFile> documents,
                                                MultipartFile logo) {
        InternalAuthUserResponse userContext = authClient.getUserByEmail(email);
        if (!"SELLER".equals(userContext.role())) {
            throw new SellerException("Only seller accounts can onboard", HttpStatus.BAD_REQUEST);
        }
        if (!userContext.emailVerified()) {
            throw new SellerException("Please verify your email before onboarding", HttpStatus.FORBIDDEN);
        }
        return register(userContext.userId(), userContext.tenantId(), request, documents, logo);
    }

    @Transactional
    public SellerProfileResponse register(UUID userId, UUID tenantId,
                                          SellerRegistrationRequest request,
                                          List<MultipartFile> documents,
                                          MultipartFile logo) {
        if (profileRepository.existsByUserId(userId)) {
            throw new SellerException("Seller profile already exists", HttpStatus.CONFLICT);
        }

        SellerProfile profile = new SellerProfile();
        profile.setUserId(userId);
        profile.setTenantId(tenantId);
        profile.setCompanyName(request.companyName());
        profile.setDescription(request.description());
        profile.setSlug(generateSlug(request.companyName()));
        profile.setContactPhone(request.contactPhone());
        profile.setContactEmail(request.contactEmail());
        profile.setContactAddress(request.contactAddress());
        profile.setStatus(SellerStatus.PENDING_APPROVAL);

        if (logo != null && !logo.isEmpty()) {
            String logoUrl = minioService.uploadLogo(tenantId, logo);
            profile.setLogoUrl(logoUrl);
        }

        SellerTheme theme = new SellerTheme();
        theme.setSeller(profile);
        profile.setTheme(theme);

        profileRepository.save(profile);

        if (documents != null) {
            for (MultipartFile doc : documents) {
                if (doc.isEmpty()) continue;
                String objectKey = minioService.uploadDocument(profile.getId(), doc);
                SellerDocument sellerDoc = new SellerDocument();
                sellerDoc.setSeller(profile);
                sellerDoc.setFileName(doc.getOriginalFilename());
                sellerDoc.setObjectKey(objectKey);
                sellerDoc.setContentType(doc.getContentType());
                profile.getDocuments().add(sellerDoc);
            }
            profileRepository.save(profile);
        }

        return toResponse(profile);
    }

    @Transactional(readOnly = true)
    public SellerProfileResponse getByUserId(UUID userId) {
        SellerProfile profile = profileRepository.findByUserId(userId)
                .orElseThrow(() -> new SellerException("Seller profile not found", HttpStatus.NOT_FOUND));
        return toResponse(profile);
    }

    @Transactional(readOnly = true)
    public SellerProfileResponse getBySlug(String slug) {
        SellerProfile profile = profileRepository.findBySlug(slug)
                .orElseThrow(() -> new SellerException("Seller not found", HttpStatus.NOT_FOUND));
        if (profile.getStatus() != SellerStatus.ACTIVE) {
            throw new SellerException("Seller not found", HttpStatus.NOT_FOUND);
        }
        return toResponse(profile);
    }

    @Transactional
    public SellerProfileResponse updateProfile(UUID userId, UpdateProfileRequest request) {
        SellerProfile profile = profileRepository.findByUserId(userId)
                .orElseThrow(() -> new SellerException("Seller profile not found", HttpStatus.NOT_FOUND));

        if (request.companyName() != null) profile.setCompanyName(request.companyName());
        if (request.description() != null) profile.setDescription(request.description());
        if (request.contactPhone() != null) profile.setContactPhone(request.contactPhone());
        if (request.contactEmail() != null) profile.setContactEmail(request.contactEmail());
        if (request.contactAddress() != null) profile.setContactAddress(request.contactAddress());

        return toResponse(profile);
    }

    @Transactional
    public SellerProfileResponse updateLogo(UUID userId, MultipartFile logo) {
        SellerProfile profile = profileRepository.findByUserId(userId)
                .orElseThrow(() -> new SellerException("Seller profile not found", HttpStatus.NOT_FOUND));
        String logoUrl = minioService.uploadLogo(profile.getTenantId(), logo);
        profile.setLogoUrl(logoUrl);
        return toResponse(profile);
    }

    @Transactional(readOnly = true)
    public SellerProfileResponse.ThemeResponse getTheme(UUID userId) {
        SellerProfile profile = profileRepository.findByUserId(userId)
                .orElseThrow(() -> new SellerException("Seller not found", HttpStatus.NOT_FOUND));
        SellerTheme theme = profile.getTheme();
        if (theme == null) return new SellerProfileResponse.ThemeResponse("nora", null, null, null, null, null);
        return toThemeResponse(theme);
    }

    @Transactional
    public SellerProfileResponse.ThemeResponse updateTheme(UUID userId, ThemeRequest request) {
        SellerProfile profile = profileRepository.findByUserId(userId)
                .orElseThrow(() -> new SellerException("Seller profile not found", HttpStatus.NOT_FOUND));
        SellerTheme theme = profile.getTheme();
        if (theme == null) {
            theme = new SellerTheme();
            theme.setSeller(profile);
            profile.setTheme(theme);
        }
        theme.setPreset(request.preset());
        theme.setPrimaryColor(request.primaryColor());
        profileRepository.save(profile);
        return toThemeResponse(theme);
    }

    @Transactional(readOnly = true)
    public List<SellerProfileResponse> listByStatus(SellerStatus status) {
        List<SellerProfile> profiles = status != null
                ? profileRepository.findByStatus(status)
                : profileRepository.findAll();
        return profiles.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public SellerProfileResponse getById(UUID sellerId) {
        SellerProfile profile = profileRepository.findById(sellerId)
                .orElseThrow(() -> new SellerException("Seller not found", HttpStatus.NOT_FOUND));
        return toResponseWithDocUrls(profile);
    }

    @Transactional
    public void approve(UUID sellerId) {
        SellerProfile profile = profileRepository.findById(sellerId)
                .orElseThrow(() -> new SellerException("Seller not found", HttpStatus.NOT_FOUND));
        profile.setStatus(SellerStatus.ACTIVE);
    }

    @Transactional
    public void reject(UUID sellerId) {
        SellerProfile profile = profileRepository.findById(sellerId)
                .orElseThrow(() -> new SellerException("Seller not found", HttpStatus.NOT_FOUND));
        profile.setStatus(SellerStatus.REJECTED);
    }

    @Transactional
    public void suspend(UUID sellerId) {
        SellerProfile profile = profileRepository.findById(sellerId)
                .orElseThrow(() -> new SellerException("Seller not found", HttpStatus.NOT_FOUND));
        profile.setStatus(SellerStatus.SUSPENDED);
    }

    @Transactional(readOnly = true)
    public String getStatusByUserId(UUID userId) {
        return profileRepository.findByUserId(userId)
                .map(p -> p.getStatus().name())
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public String getStatusByTenantId(UUID tenantId) {
        return profileRepository.findByTenantId(tenantId)
                .map(p -> p.getStatus().name())
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<UUID> getActiveTenantIds() {
        return profileRepository.findByStatus(SellerStatus.ACTIVE)
                .stream()
                .map(SellerProfile::getTenantId)
                .toList();
    }

    private SellerProfileResponse toResponse(SellerProfile profile) {
        List<SellerProfileResponse.DocumentResponse> docs = profile.getDocuments().stream()
                .map(d -> new SellerProfileResponse.DocumentResponse(
                        d.getId(), d.getFileName(), d.getContentType(), null, d.getUploadedAt()))
                .toList();

        SellerProfileResponse.ThemeResponse themeResp = profile.getTheme() != null
                ? toThemeResponse(profile.getTheme()) : null;

        return new SellerProfileResponse(
                profile.getId(), profile.getUserId(), profile.getTenantId(),
                profile.getCompanyName(), profile.getDescription(), profile.getSlug(),
                profile.getContactPhone(), profile.getContactEmail(), profile.getContactAddress(),
            profile.getLogoUrl(), profile.getStatus(), profile.getCreatedAt(),
                docs, themeResp);
    }

    private SellerProfileResponse toResponseWithDocUrls(SellerProfile profile) {
        List<SellerProfileResponse.DocumentResponse> docs = profile.getDocuments().stream()
                .map(d -> new SellerProfileResponse.DocumentResponse(
                        d.getId(), d.getFileName(), d.getContentType(),
                        minioService.getPresignedUrl(d.getObjectKey()), d.getUploadedAt()))
                .toList();

        SellerProfileResponse.ThemeResponse themeResp = profile.getTheme() != null
                ? toThemeResponse(profile.getTheme()) : null;

        return new SellerProfileResponse(
                profile.getId(), profile.getUserId(), profile.getTenantId(),
                profile.getCompanyName(), profile.getDescription(), profile.getSlug(),
                profile.getContactPhone(), profile.getContactEmail(), profile.getContactAddress(),
            profile.getLogoUrl(), profile.getStatus(), profile.getCreatedAt(),
                docs, themeResp);
    }

    private SellerProfileResponse.ThemeResponse toThemeResponse(SellerTheme theme) {
        return new SellerProfileResponse.ThemeResponse(
                theme.getPreset(), theme.getPrimaryColor(),
                theme.getFontFamily(), theme.getBorderRadius(),
                theme.getBannerUrl(), theme.getLogoUrl());
    }

    private String generateSlug(String companyName) {
        String normalized = Normalizer.normalize(companyName.toLowerCase(), Normalizer.Form.NFD);
        String slug = Pattern.compile("[^a-z0-9\\s-]").matcher(normalized).replaceAll("");
        slug = slug.trim().replaceAll("[\\s-]+", "-");
        if (profileRepository.existsBySlug(slug)) {
            slug = slug + "-" + UUID.randomUUID().toString().substring(0, 6);
        }
        return slug;
    }
}
