package com.platform.seller.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "seller_themes")
@Getter
@Setter
@NoArgsConstructor
public class SellerTheme {

    @Id
    private UUID sellerId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "seller_id")
    private SellerProfile seller;

    @Column(nullable = false)
    private String preset = "amber";

    private String primaryColor;
    private String fontFamily;
    private String borderRadius;
    private String bannerUrl;
    private String logoUrl;
}
