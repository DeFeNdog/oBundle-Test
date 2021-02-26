import utils, { hooks } from '@bigcommerce/stencil-utils';
import CatalogPage from './catalog';
import compareProducts from './global/compare-products';
import FacetedSearch from './common/faceted-search';
import { createTranslationDictionary } from '../theme/common/utils/translations-utils';

export default class Category extends CatalogPage {

    constructor(context) {
        super(context);
        this.validationDictionary = createTranslationDictionary(context);
        this.cartId = undefined;
    }

    onReady() {
        $('[data-button-type="add-cart"]').on('click', (e) => {
            $(e.currentTarget).next().attr({
                role: 'status',
                'aria-live': 'polite',
            });
        });

        compareProducts(this.context.urls);

        if ($('#facetedSearch').length > 0) {
            this.initFacetedSearch();
        } else {
            this.onSortBySubmit = this.onSortBySubmit.bind(this);
            hooks.on('sortBy-submitted', this.onSortBySubmit);
        }

       $('a.reset-btn').on('click', () => {
            $('span.reset-message').attr({
                role: 'status',
                'aria-live': 'polite',
            });
        });

        this.ariaNotifyNoProducts();

        $('.alertBox').on('click', () => {
            $(event.target).hide();
        });

        this.cartId = this.context.cartId;
        this.productHoverInit();
        this.addAllToCartInit();
        this.emptyCartInit();
        this.previewCartInit();
    }

    getCart(url) {
        return fetch(url, {
            method: "GET",
            credentials: "same-origin"
        })
        .then(response => response.json());
    };

    createCart(url, cartItems) {
        return fetch(url, {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json"},
            body: JSON.stringify(cartItems),
        })
       .then(response => response.json());
    };

    addCartItem(url, cartId, cartItems) {
        return fetch(url + cartId + '/items', {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json"},
            body: JSON.stringify(cartItems),
        })
        .then(response => response.json());
    };

    emptyCart(url, cartId) {
        return fetch(url + cartId, {
            method: "DELETE",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json"}
        })
        .then(response => response);
    };

    previewCartInit() {
        const $body = $('body');
        const secureBaseUrl = this.context.secureBaseUrl;

        let quantity = 0;
        let that = this;
        let cartId = this.cartId;

        if (cartId) {
            // Get existing quantity from localStorage if found
            if (utils.tools.storage.localStorageAvailable()) {
                if (localStorage.getItem('cart-quantity')) {
                    quantity = Number(localStorage.getItem('cart-quantity'));
                    $body.trigger('cart-quantity-update', quantity);
                }
            }

            // Get updated cart quantity from the Cart API
            const cartQtyPromise = new Promise((resolve, reject) => {
                utils.api.cart.getCartQuantity({ baseUrl: secureBaseUrl, cartId }, (err, qty) => {
                    if (err) {
                        // If this appears to be a 404 for the cart ID, set cart quantity to 0
                        if (err === 'Not Found') {
                            resolve(0);
                        } else {
                            reject(err);
                        }
                    }
                    resolve(qty);
                });
            });

            // If the Cart API gives us a different quantity number, update it
            cartQtyPromise.then(qty => {
                quantity = qty;
                $body.trigger('cart-quantity-update', quantity);
            });
        } else {
            $body.trigger('cart-quantity-update', quantity);
        }
    };

    refreshCartInfo(quantity, msgClass, msg) {
        const loadingClass = 'is-loading';
        const $cart = $('[data-cart-preview]');
        const $cartDropdown = $('#cart-preview-dropdown');
        const $cartLoading = $('<div class="loadingOverlay"></div>');
        const options = {
            template: 'common/cart-preview',
        };

        $('.alertBox').hide();
        $(msgClass).text(msg);
        $(msgClass).show();

        if (quantity) {
            $('[data-button-type="empty-cart"]').removeClass('u-hiddenVisually');
        } else {
            $('[data-button-type="empty-cart"]').addClass('u-hiddenVisually');
        }

        $('body').trigger('cart-quantity-update', quantity);

        if (utils.tools.storage.localStorageAvailable()) {
            localStorage.setItem('cart-quantity', quantity);
        }

        $cartDropdown
            .addClass(loadingClass)
            .html($cartLoading);
        $cartLoading
            .show();

        utils.api.cart.getContent(options, (err, response) => {
            $cartDropdown
                .removeClass(loadingClass)
                .html(response);
            $cartLoading
                .hide();
        });
    }

    addAllToCartInit() {
        let that = this;
        let url = '/api/storefront/carts/';
        let cartItems = {
           "lineItems": []
        };

        $('[data-button-type="add-all-cart"]').on('click', (e) => {
            e.stopPropagation();

            $(e.currentTarget).next().attr({
                role: 'status',
                'aria-live': 'polite',
            });

            let productIds = $(event.target).attr('data-product-ids').split(',');
            productIds.pop();

            if (!productIds.length) {
                $('.alertBox--error').text('Unable to add all to cart.');
                $('.alertBox--error').show();
                return;
            }

            for (let productId of productIds) {
                cartItems.lineItems.push({"quantity": 1, "productId": productId});
            }

            if (!that.cartId) {
                that.createCart('/api/storefront/carts', cartItems)
                .then(data => {
                    let quantity = productIds.length;

                    that.getCart('/api/storefront/carts?include=lineItems.digitalItems.options,lineItems.physicalItems.options')
                    .then(function(data) {
                        that.cartId = data[0].id;
                    })
                    .catch(error => console.error(error));

                    that.refreshCartInfo(
                        quantity,
                        '.alertBox--success',
                        'All added to cart!'
                    );
                })
                .catch(error => {
                    console.error(error);
                    $('.alertBox--error').text('Error adding items to cart.');
                    $('.alertBox--error').show();
                });
            } else {
                that.addCartItem(url, that.cartId, cartItems)
                .then(data => {
                    that.getCart('/api/storefront/carts?include=lineItems.digitalItems.options,lineItems.physicalItems.options')
                    .then(function(data) {
                        let physicalItemsCount = data[0].lineItems.physicalItems.length;
                        let digitalItemsCount = data[0].lineItems.digitalItems.length;
                        let giftCertificatesCount = data[0].lineItems.giftCertificates.length;
                        let customItemsCount = data[0].lineItems.customItems.length;
                        let quantity = physicalItemsCount + digitalItemsCount + giftCertificatesCount + customItemsCount;

                        that.cartId = data[0].id;
                        that.refreshCartInfo(
                            quantity,
                            '.alertBox--success',
                            'All added to cart!'
                        );
                    })
                    .catch(error => console.error(error));
                })
                .catch(error => {
                    console.error(error);
                    $('.alertBox--error').text('Error adding items to cart.');
                    $('.alertBox--error').show();
                });
            }
        });
    }

    emptyCartInit() {
        let that = this;
        let button = $('[data-button-type="empty-cart"]');

        button.show();
        button.on('click', (e) => {
           e.stopPropagation();

            $(e.currentTarget).next().attr({
                role: 'status',
                'aria-live': 'polite',
            });

            let url = '/api/storefront/carts/';

            if (!that.cartId) {
                that.getCart('/api/storefront/carts?include=lineItems.digitalItems.options,lineItems.physicalItems.options')
                .then(function(data) {
                    that.cartId = data[0].id;
                })
                .catch(error => console.error(error));
            }

            that.emptyCart(url, that.cartId)
            .then(data => {
                that.cartId = undefined;
                that.refreshCartInfo(0, '.alertBox--success', 'Cart Emptied');
            })
            .catch(error => {
                console.error(error);
            });
        });
    }

    swapMainImage(image, url, srcset) {
        /*
        lazysizes author indicates that simly having the 'lazyload'
        class will allow lazySizes to pick up on any changes. No need for
        manual reload. Nice!

        https://github.com/aFarkas/lazysizes/issues/46#issuecomment-72039737
        */
        const isBrowserIE = navigator.userAgent.includes('Trident');
        image.attr("src", url);
        image.attr("srcset", srcset);
        image.attr("data-srcset", srcset);

        if (isBrowserIE) {
            const fallbackStylesIE = {
                'background-image': `url(${url})`,
                'background-position': 'center',
                'background-repeat': 'no-repeat',
                'background-origin': 'content-box',
                'background-size': 'contain',
            };
            image.css(fallbackStylesIE);
        }
    }

    productHoverInit() {
        /*
        Added `images` parameter to responsive-img partial call in:
        /templates/components/products/card.html

        Secondary image attributes set in:
        /templates/components/common/responsive-img.html
        */
        let image;
        let mainImage = {};
        let secondaryImage = {};
        let swappable = false;
        let that = this;

        $('.card').hover(
            function() {
                image = $(this).find('img');

                mainImage.url = image.attr('src');
                mainImage.srcset = image.attr('srcset');

                secondaryImage.url = image.attr('data-secondary-image-src');
                secondaryImage.srcset = image.attr('data-secondary-image-srcset');

                // Secondary img atts exist? Ignore/return if not.
                swappable = secondaryImage.url && secondaryImage.srcset ? true : false;
                if (!swappable) { return; }

                that.swapMainImage(
                    image,
                    secondaryImage.url,
                    secondaryImage.srcset
                );
            }, function() {
                if (!swappable) { return; }

                that.swapMainImage(
                    image,
                    mainImage['url'],
                    mainImage['srcset']
                );
            }
        );
    }

    ariaNotifyNoProducts() {
        const $noProductsMessage = $('[data-no-products-notification]');
        if ($noProductsMessage.length) {
            $noProductsMessage.focus();
        }
    }

    initFacetedSearch() {
        const {
            price_min_evaluation: onMinPriceError,
            price_max_evaluation: onMaxPriceError,
            price_min_not_entered: minPriceNotEntered,
            price_max_not_entered: maxPriceNotEntered,
            price_invalid_value: onInvalidPrice,
        } = this.validationDictionary;
        const $productListingContainer = $('#product-listing-container');
        const $facetedSearchContainer = $('#faceted-search-container');
        const productsPerPage = this.context.categoryProductsPerPage;
        const requestOptions = {
            config: {
                category: {
                    shop_by_price: true,
                    products: {
                        limit: productsPerPage,
                    },
                },
            },
            template: {
                productListing: 'category/product-listing',
                sidebar: 'category/sidebar',
            },
            showMore: 'category/show-more',
        };

        this.facetedSearch = new FacetedSearch(requestOptions, (content) => {
            $productListingContainer.html(content.productListing);
            $facetedSearchContainer.html(content.sidebar);

            $('body').triggerHandler('compareReset');

            $('html, body').animate({
                scrollTop: 0,
            }, 100);
        }, {
            validationErrorMessages: {
                onMinPriceError,
                onMaxPriceError,
                minPriceNotEntered,
                maxPriceNotEntered,
                onInvalidPrice,
            },
        });
    }
}
