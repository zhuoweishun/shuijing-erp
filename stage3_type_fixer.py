#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
第三阶段：类型定义修复脚本
处理接口属性不匹配、类型注解错误和统一属性命名等问题
"""

import os
import re
import json
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple, Set

class Stage3TypeFixer:
    def __init__(self):
        self.project_root = Path.cwd()
        self.src_dir = self.project_root / 'src'
        self.types_dir = self.project_root / 'src' / 'types'
        self.shared_types_dir = self.project_root / 'shared' / 'types'
        self.backup_dir = self.project_root / 'backups' / 'stage3_type_fixes'
        self.timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # 统计信息
        self.stats = {
            'files_processed': 0,
            'files_modified': 0,
            'total_fixes': 0,
            'interface_fixes': 0,
            'type_annotation_fixes': 0,
            'property_fixes': 0,
            'function_type_fixes': 0
        }
        
        # 修复日志
        self.fix_log = []
        
        # 类型定义修复映射
        self.type_mappings = {
            # 基础字段映射
            'isActive': 'is_active',
            'isDeleted': 'is_deleted',
            'lastLoginAt': 'last_login_at',
            'realName': 'real_name',
            'unitCost': 'unit_cost',
            'materialStatus': 'material_status',
            'materialAction': 'material_action',
            'returnedMaterials': 'returned_materials',
            'productId': 'product_id',
            'productCode': 'product_code',
            'productDistribution': 'product_distribution',
            'pricePerPiece': 'price_per_piece',
            'remainingBeads': 'remaining_beads',
            'lastEditedById': 'last_edited_by_id',
            'supplierCode': 'supplier_code',
            'supplierInfo': 'supplier_info',
            'contactPerson': 'contact_person',
            'inventoryId': 'inventory_id',
            'stockQuantity': 'stock_quantity',
            'reservedQuantity': 'reserved_quantity',
            'hasLowStock': 'has_low_stock',
            'lowStockThreshold': 'low_stock_threshold',
            'skuNumber': 'sku_number',
            'customerAddress': 'customer_address',
            'daysSinceLastPurchase': 'days_since_last_purchase',
            'daysSinceFirstPurchase': 'days_since_first_purchase',
            'customerLabels': 'customer_labels',
            'primaryLabel': 'primary_label',
            'returnToMaterial': 'return_to_material',
            'customReturnQuantities': 'custom_return_quantities',
            'costAdjustment': 'cost_adjustment',
            'newQuantity': 'new_quantity',
            'soldQuantity': 'sold_quantity',
            'destroyedQuantity': 'destroyed_quantity',
            'restockedQuantity': 'restocked_quantity',
            'refundedQuantity': 'refunded_quantity',
            'newAvailableQuantity': 'new_available_quantity',
            'consumedMaterials': 'consumed_materials',
            'saleInfo': 'sale_info',
            'skuInfo': 'sku_info',
            'skuUnitPrice': 'sku_unit_price',
            'actualUnitPrice': 'actual_unit_price',
            'currentQuantity': 'current_quantity',
            'canRestock': 'can_restock',
            'insufficientMaterials': 'insufficient_materials',
            'logId': 'log_id',
            'operatorId': 'operator_id',
            'operatorName': 'operator_name',
            'specificationValue': 'specification_value',
            'specificationUnit': 'specification_unit',
            'maxTokens': 'max_tokens',
            'destroyedAt': 'destroyed_at',
            'restoredMaterials': 'restored_materials',
            'newCustomers': 'new_customers',
            'repeatCustomers': 'repeat_customers',
            'vipCustomers': 'vip_customers',
            'activeCustomers': 'active_customers',
            'inactiveCustomers': 'inactive_customers',
            'userId': 'user_id',
            'userName': 'user_name',
            'userRole': 'user_role',
            'createdAt': 'created_at',
            'updatedAt': 'updated_at',
            'deletedAt': 'deleted_at',
            'materialName': 'material_name',
            'materialType': 'material_type',
            'purchaseId': 'purchase_id',
            'purchaseDate': 'purchase_date',
            'purchaseCode': 'purchase_code',
            'supplierName': 'supplier_name',
            'totalCost': 'total_cost',
            'totalPrice': 'total_price',
            'totalQuantity': 'total_quantity',
            'totalAmount': 'total_amount',
            'apiUrl': 'api_url',
            'baseUrl': 'base_url',
            'apiKey': 'api_key',
            'accessToken': 'access_token',
            'refreshToken': 'refresh_token',
            'expiresAt': 'expires_at',
            'errorCode': 'error_code',
            'errorMessage': 'error_message',
            'statusCode': 'status_code',
            'responseData': 'response_data',
            'requestId': 'request_id',
            'sessionId': 'session_id',
            'deviceId': 'device_id',
            'ipAddress': 'ip_address',
            'userAgent': 'user_agent',
            'browserInfo': 'browser_info',
            'osInfo': 'os_info',
            'screenSize': 'screen_size',
            'viewportSize': 'viewport_size',
            'pageUrl': 'page_url',
            'referrerUrl': 'referrer_url',
            'searchQuery': 'search_query',
            'filterOptions': 'filter_options',
            'sortOptions': 'sort_options',
            'pageNumber': 'page_number',
            'pageSize': 'page_size',
            'totalPages': 'total_pages',
            'hasNextPage': 'has_next_page',
            'hasPrevPage': 'has_prev_page',
            'startDate': 'start_date',
            'endDate': 'end_date',
            'dateRange': 'date_range',
            'timeZone': 'time_zone',
            'localeCode': 'locale_code',
            'currencyCode': 'currency_code',
            'exchangeRate': 'exchange_rate',
            'taxRate': 'tax_rate',
            'discountRate': 'discount_rate',
            'shippingCost': 'shipping_cost',
            'handlingFee': 'handling_fee',
            'serviceFee': 'service_fee',
            'processingFee': 'processing_fee',
            'transactionId': 'transaction_id',
            'paymentId': 'payment_id',
            'orderId': 'order_id',
            'invoiceId': 'invoice_id',
            'receiptId': 'receipt_id',
            'trackingId': 'tracking_id',
            'batchId': 'batch_id',
            'groupId': 'group_id',
            'categoryId': 'category_id',
            'tagId': 'tag_id',
            'labelId': 'label_id',
            'statusId': 'status_id',
            'typeId': 'type_id',
            'roleId': 'role_id',
            'permissionId': 'permission_id',
            'settingId': 'setting_id',
            'configId': 'config_id',
            'templateId': 'template_id',
            'layoutId': 'layout_id',
            'themeId': 'theme_id',
            'styleId': 'style_id',
            'scriptId': 'script_id',
            'moduleId': 'module_id',
            'componentId': 'component_id',
            'widgetId': 'widget_id',
            'elementId': 'element_id',
            'fieldId': 'field_id',
            'formId': 'form_id',
            'inputId': 'input_id',
            'buttonId': 'button_id',
            'linkId': 'link_id',
            'imageId': 'image_id',
            'videoId': 'video_id',
            'audioId': 'audio_id',
            'fileId': 'file_id',
            'documentId': 'document_id',
            'reportId': 'report_id',
            'chartId': 'chart_id',
            'graphId': 'graph_id',
            'tableId': 'table_id',
            'columnId': 'column_id',
            'rowId': 'row_id',
            'cellId': 'cell_id',
            'menuId': 'menu_id',
            'itemId': 'item_id',
            'optionId': 'option_id',
            'valueId': 'value_id',
            'keyId': 'key_id',
            'indexId': 'index_id',
            'positionId': 'position_id',
            'locationId': 'location_id',
            'addressId': 'address_id',
            'contactId': 'contact_id',
            'phoneId': 'phone_id',
            'emailId': 'email_id',
            'websiteId': 'website_id',
            'socialId': 'social_id',
            'profileId': 'profile_id',
            'accountId': 'account_id',
            'subscriptionId': 'subscription_id',
            'planId': 'plan_id',
            'packageId': 'package_id',
            'bundleId': 'bundle_id',
            'offererId': 'offer_id',
            'dealId': 'deal_id',
            'couponId': 'coupon_id',
            'voucherId': 'voucher_id',
            'rewardId': 'reward_id',
            'pointId': 'point_id',
            'creditId': 'credit_id',
            'balanceId': 'balance_id',
            'walletId': 'wallet_id',
            'cardId': 'card_id',
            'bankId': 'bank_id',
            'branchId': 'branch_id',
            'routingId': 'routing_id',
            'swiftId': 'swift_id',
            'ibanId': 'iban_id',
            'sortId': 'sort_id',
            'bsbId': 'bsb_id',
            'abaId': 'aba_id',
            'achId': 'ach_id',
            'wireId': 'wire_id',
            'checkId': 'check_id',
            'cashId': 'cash_id',
            'cryptoId': 'crypto_id',
            'tokenId': 'token_id',
            'coinId': 'coin_id',
            'chainId': 'chain_id',
            'blockId': 'block_id',
            'hashId': 'hash_id',
            'nonceId': 'nonce_id',
            'gasId': 'gas_id',
            'feeId': 'fee_id',
            'limitId': 'limit_id',
            'priceId': 'price_id',
            'rateId': 'rate_id',
            'volumeId': 'volume_id',
            'marketId': 'market_id',
            'exchangeId': 'exchange_id',
            'pairId': 'pair_id',
            'symbolId': 'symbol_id',
            'tickerId': 'ticker_id',
            'quoteId': 'quote_id',
            'bidId': 'bid_id',
            'askId': 'ask_id',
            'spreadId': 'spread_id',
            'slippageId': 'slippage_id',
            'liquidityId': 'liquidity_id',
            'depthId': 'depth_id',
            'orderBookId': 'order_book_id',
            'tradeId': 'trade_id',
            'executionId': 'execution_id',
            'fillId': 'fill_id',
            'matchId': 'match_id',
            'settlementId': 'settlement_id',
            'clearingId': 'clearing_id',
            'custodyId': 'custody_id',
            'escrowId': 'escrow_id',
            'trustId': 'trust_id',
            'fundId': 'fund_id',
            'portfolioId': 'portfolio_id',
            'assetId': 'asset_id',
            'securityId': 'security_id',
            'instrumentId': 'instrument_id',
            'contractId': 'contract_id',
            'agreementId': 'agreement_id',
            'termId': 'term_id',
            'conditionId': 'condition_id',
            'clauseId': 'clause_id',
            'sectionId': 'section_id',
            'paragraphId': 'paragraph_id',
            'sentenceId': 'sentence_id',
            'wordId': 'word_id',
            'characterId': 'character_id',
            'byteId': 'byte_id',
            'bitId': 'bit_id',
            'flagId': 'flag_id',
            'maskId': 'mask_id',
            'patternId': 'pattern_id',
            'regexId': 'regex_id',
            'formatId': 'format_id',
            'encodingId': 'encoding_id',
            'compressionId': 'compression_id',
            'encryptionId': 'encryption_id',
            'hashingId': 'hashing_id',
            'signingId': 'signing_id',
            'verificationId': 'verification_id',
            'authenticationId': 'authentication_id',
            'authorizationId': 'authorization_id',
            'permissionLevel': 'permission_level',
            'accessLevel': 'access_level',
            'securityLevel': 'security_level',
            'privacyLevel': 'privacy_level',
            'confidentialityLevel': 'confidentiality_level',
            'integrityLevel': 'integrity_level',
            'availabilityLevel': 'availability_level',
            'reliabilityLevel': 'reliability_level',
            'durabilityLevel': 'durability_level',
            'scalabilityLevel': 'scalability_level',
            'performanceLevel': 'performance_level',
            'efficiencyLevel': 'efficiency_level',
            'qualityLevel': 'quality_level',
            'maturityLevel': 'maturity_level',
            'stabilityLevel': 'stability_level',
            'compatibilityLevel': 'compatibility_level',
            'interoperabilityLevel': 'interoperability_level',
            'portabilityLevel': 'portability_level',
            'maintainabilityLevel': 'maintainability_level',
            'testabilityLevel': 'testability_level',
            'debuggabilityLevel': 'debuggability_level',
            'monitorabilityLevel': 'monitorability_level',
            'observabilityLevel': 'observability_level',
            'traceabilityLevel': 'traceability_level',
            'auditabilityLevel': 'auditability_level',
            'complianceLevel': 'compliance_level',
            'governanceLevel': 'governance_level',
            'managementLevel': 'management_level',
            'operationLevel': 'operation_level',
            'maintenanceLevel': 'maintenance_level',
            'supportLevel': 'support_level',
            'serviceLevel': 'service_level',
            'customerLevel': 'customer_level',
            'userLevel': 'user_level',
            'adminLevel': 'admin_level',
            'superLevel': 'super_level',
            'rootLevel': 'root_level',
            'systemLevel': 'system_level',
            'applicationLevel': 'application_level',
            'databaseLevel': 'database_level',
            'networkLevel': 'network_level',
            'infrastructureLevel': 'infrastructure_level',
            'platformLevel': 'platform_level',
            'frameworkLevel': 'framework_level',
            'libraryLevel': 'library_level',
            'moduleLevel': 'module_level',
            'componentLevel': 'component_level',
            'serviceLevel': 'service_level',
            'microserviceLevel': 'microservice_level',
            'apiLevel': 'api_level',
            'endpointLevel': 'endpoint_level',
            'routeLevel': 'route_level',
            'handlerLevel': 'handler_level',
            'middlewareLevel': 'middleware_level',
            'filterLevel': 'filter_level',
            'interceptorLevel': 'interceptor_level',
            'decoratorLevel': 'decorator_level',
            'annotationLevel': 'annotation_level',
            'metadataLevel': 'metadata_level',
            'configurationLevel': 'configuration_level',
            'settingLevel': 'setting_level',
            'parameterLevel': 'parameter_level',
            'argumentLevel': 'argument_level',
            'variableLevel': 'variable_level',
            'constantLevel': 'constant_level',
            'enumLevel': 'enum_level',
            'typeLevel': 'type_level',
            'interfaceLevel': 'interface_level',
            'classLevel': 'class_level',
            'objectLevel': 'object_level',
            'instanceLevel': 'instance_level',
            'propertyLevel': 'property_level',
            'attributeLevel': 'attribute_level',
            'fieldLevel': 'field_level',
            'methodLevel': 'method_level',
            'functionLevel': 'function_level',
            'procedureLevel': 'procedure_level',
            'routineLevel': 'routine_level',
            'subroutineLevel': 'subroutine_level',
            'callbackLevel': 'callback_level',
            'listenerLevel': 'listener_level',
            'handlerLevel': 'handler_level',
            'processorLevel': 'processor_level',
            'workerLevel': 'worker_level',
            'threadLevel': 'thread_level',
            'processLevel': 'process_level',
            'taskLevel': 'task_level',
            'jobLevel': 'job_level',
            'queueLevel': 'queue_level',
            'stackLevel': 'stack_level',
            'heapLevel': 'heap_level',
            'poolLevel': 'pool_level',
            'cacheLevel': 'cache_level',
            'bufferLevel': 'buffer_level',
            'streamLevel': 'stream_level',
            'channelLevel': 'channel_level',
            'pipeLevel': 'pipe_level',
            'socketLevel': 'socket_level',
            'connectionLevel': 'connection_level',
            'sessionLevel': 'session_level',
            'transactionLevel': 'transaction_level',
            'batchLevel': 'batch_level',
            'bulkLevel': 'bulk_level',
            'massLevel': 'mass_level',
            'volumeLevel': 'volume_level',
            'capacityLevel': 'capacity_level',
            'limitLevel': 'limit_level',
            'thresholdLevel': 'threshold_level',
            'boundaryLevel': 'boundary_level',
            'rangeLevel': 'range_level',
            'scopeLevel': 'scope_level',
            'contextLevel': 'context_level',
            'environmentLevel': 'environment_level',
            'namespaceLevel': 'namespace_level',
            'domainLevel': 'domain_level',
            'realmLevel': 'realm_level',
            'zoneLevel': 'zone_level',
            'regionLevel': 'region_level',
            'areaLevel': 'area_level',
            'sectorLevel': 'sector_level',
            'segmentLevel': 'segment_level',
            'partitionLevel': 'partition_level',
            'shardLevel': 'shard_level',
            'clusterLevel': 'cluster_level',
            'nodeLevel': 'node_level',
            'instanceLevel': 'instance_level',
            'replicaLevel': 'replica_level',
            'backupLevel': 'backup_level',
            'snapshotLevel': 'snapshot_level',
            'checkpointLevel': 'checkpoint_level',
            'savePointLevel': 'save_point_level',
            'restorePointLevel': 'restore_point_level',
            'recoveryPointLevel': 'recovery_point_level',
            'rollbackPointLevel': 'rollback_point_level',
            'commitPointLevel': 'commit_point_level',
            'mergePointLevel': 'merge_point_level',
            'branchPointLevel': 'branch_point_level',
            'forkPointLevel': 'fork_point_level',
            'joinPointLevel': 'join_point_level',
            'splitPointLevel': 'split_point_level',
            'entryPointLevel': 'entry_point_level',
            'exitPointLevel': 'exit_point_level',
            'breakPointLevel': 'break_point_level',
            'continuePointLevel': 'continue_point_level',
            'returnPointLevel': 'return_point_level',
            'yieldPointLevel': 'yield_point_level',
            'awaitPointLevel': 'await_point_level',
            'syncPointLevel': 'sync_point_level',
            'asyncPointLevel': 'async_point_level',
            'promiseLevel': 'promise_level',
            'futureLevel': 'future_level',
            'deferredLevel': 'deferred_level',
            'observableLevel': 'observable_level',
            'subjectLevel': 'subject_level',
            'behaviorLevel': 'behavior_level',
            'replayLevel': 'replay_level',
            'publishLevel': 'publish_level',
            'subscribeLevel': 'subscribe_level',
            'unsubscribeLevel': 'unsubscribe_level',
            'emitLevel': 'emit_level',
            'listenLevel': 'listen_level',
            'onLevel': 'on_level',
            'offLevel': 'off_level',
            'onceLevel': 'once_level',
            'addListenerLevel': 'add_listener_level',
            'removeListenerLevel': 'remove_listener_level',
            'removeAllListenersLevel': 'remove_all_listeners_level',
            'setMaxListenersLevel': 'set_max_listeners_level',
            'getMaxListenersLevel': 'get_max_listeners_level',
            'listenerCountLevel': 'listener_count_level',
            'listenersLevel': 'listeners_level',
            'rawListenersLevel': 'raw_listeners_level',
            'prependListenerLevel': 'prepend_listener_level',
            'prependOnceListenerLevel': 'prepend_once_listener_level',
            'eventNamesLevel': 'event_names_level'
        }
        
        # React内置类型和第三方库类型（保留不修改）
        self.preserve_types = {
            'MouseEvent', 'ChangeEvent', 'FormEvent', 'KeyboardEvent', 'FocusEvent',
            'TouchEvent', 'WheelEvent', 'AnimationEvent', 'TransitionEvent',
            'ClipboardEvent', 'DragEvent', 'PointerEvent', 'UIEvent', 'SyntheticEvent',
            'React', 'ReactNode', 'ReactElement', 'Component', 'PureComponent',
            'FC', 'FunctionComponent', 'ComponentType', 'ComponentProps',
            'RefObject', 'MutableRefObject', 'Ref', 'ForwardedRef',
            'useState', 'useEffect', 'useContext', 'useReducer', 'useCallback',
            'useMemo', 'useRef', 'useImperativeHandle', 'useLayoutEffect',
            'useDebugValue', 'useDeferredValue', 'useTransition', 'useId',
            'HTMLElement', 'HTMLInputElement', 'HTMLButtonElement', 'HTMLFormElement',
            'HTMLDivElement', 'HTMLSpanElement', 'HTMLImageElement', 'HTMLAnchorElement',
            'Document', 'Window', 'Event', 'EventTarget', 'Node', 'Element',
            'Promise', 'Array', 'Object', 'String', 'Number', 'Boolean', 'Date',
            'RegExp', 'Error', 'Function', 'Map', 'Set', 'WeakMap', 'WeakSet',
            'Symbol', 'BigInt', 'ArrayBuffer', 'DataView', 'Int8Array', 'Uint8Array',
            'Uint8ClampedArray', 'Int16Array', 'Uint16Array', 'Int32Array', 'Uint32Array',
            'Float32Array', 'Float64Array', 'BigInt64Array', 'BigUint64Array'
        }
    
    def create_backup(self):
        """创建备份目录"""
        if self.backup_dir.exists():
            shutil.rmtree(self.backup_dir)
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        print(f"✅ 创建备份目录: {self.backup_dir}")
    
    def backup_file(self, file_path: Path):
        """备份单个文件"""
        relative_path = file_path.relative_to(self.project_root)
        backup_file_path = self.backup_dir / relative_path
        backup_file_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(file_path, backup_file_path)
    
    def get_target_files(self) -> List[Path]:
        """获取需要处理的文件列表"""
        target_files = []
        
        # 搜索src目录
        if self.src_dir.exists():
            for ext in ['*.ts', '*.tsx']:
                target_files.extend(self.src_dir.rglob(ext))
        
        # 搜索shared/types目录
        if self.shared_types_dir.exists():
            for ext in ['*.ts', '*.tsx']:
                target_files.extend(self.shared_types_dir.rglob(ext))
        
        # 过滤掉node_modules和其他不需要的目录
        filtered_files = []
        for file_path in target_files:
            if not any(part.startswith('.') or part == 'node_modules' for part in file_path.parts):
                filtered_files.append(file_path)
        
        return filtered_files
    
    def fix_interface_properties(self, content: str) -> Tuple[str, int]:
        """修复接口属性命名"""
        fixes = 0
        
        # 匹配接口定义中的属性
        interface_pattern = r'(interface\s+\w+\s*\{[^}]*?)([a-zA-Z_][a-zA-Z0-9_]*)(\s*[?:]\s*[^;,}]+[;,]?)'
        
        def replace_interface_prop(match):
            nonlocal fixes
            prefix = match.group(1)
            prop_name = match.group(2)
            suffix = match.group(3)
            
            if prop_name in self.type_mappings:
                fixes += 1
                new_prop_name = self.type_mappings[prop_name]
                self.fix_log.append({
                    'type': 'interface_property',
                    'old': prop_name,
                    'new': new_prop_name,
                    'context': f'interface property: {prop_name} → {new_prop_name}'
                })
                return f"{prefix}{new_prop_name}{suffix}"
            
            return match.group(0)
        
        content = re.sub(interface_pattern, replace_interface_prop, content, flags=re.MULTILINE | re.DOTALL)
        
        return content, fixes
    
    def fix_type_annotations(self, content: str) -> Tuple[str, int]:
        """修复类型注解"""
        fixes = 0
        
        # 匹配类型注解中的属性
        type_pattern = r'(:\s*\{[^}]*?)([a-zA-Z_][a-zA-Z0-9_]*)(\s*[?:]\s*[^;,}]+[;,]?)'
        
        def replace_type_prop(match):
            nonlocal fixes
            prefix = match.group(1)
            prop_name = match.group(2)
            suffix = match.group(3)
            
            if prop_name in self.type_mappings:
                fixes += 1
                new_prop_name = self.type_mappings[prop_name]
                self.fix_log.append({
                    'type': 'type_annotation',
                    'old': prop_name,
                    'new': new_prop_name,
                    'context': f'type annotation: {prop_name} → {new_prop_name}'
                })
                return f"{prefix}{new_prop_name}{suffix}"
            
            return match.group(0)
        
        content = re.sub(type_pattern, replace_type_prop, content, flags=re.MULTILINE | re.DOTALL)
        
        return content, fixes
    
    def fix_object_properties(self, content: str) -> Tuple[str, int]:
        """修复对象属性"""
        fixes = 0
        
        # 匹配对象字面量中的属性
        obj_pattern = r'(\{[^}]*?)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:\s*[^,}]+[,}]?)'
        
        def replace_obj_prop(match):
            nonlocal fixes
            prefix = match.group(1)
            prop_name = match.group(2)
            suffix = match.group(3)
            
            if prop_name in self.type_mappings:
                fixes += 1
                new_prop_name = self.type_mappings[prop_name]
                self.fix_log.append({
                    'type': 'object_property',
                    'old': prop_name,
                    'new': new_prop_name,
                    'context': f'object property: {prop_name} → {new_prop_name}'
                })
                return f"{prefix}{new_prop_name}{suffix}"
            
            return match.group(0)
        
        content = re.sub(obj_pattern, replace_obj_prop, content, flags=re.MULTILINE | re.DOTALL)
        
        return content, fixes
    
    def fix_function_parameters(self, content: str) -> Tuple[str, int]:
        """修复函数参数类型"""
        fixes = 0
        
        # 匹配函数参数中的类型定义
        param_pattern = r'(\([^)]*?)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:\s*\{[^}]*?)([a-zA-Z_][a-zA-Z0-9_]*)(\s*[?:]\s*[^;,}]+[;,}])'
        
        def replace_param_type(match):
            nonlocal fixes
            prefix1 = match.group(1)
            param_name = match.group(2)
            prefix2 = match.group(3)
            prop_name = match.group(4)
            suffix = match.group(5)
            
            if prop_name in self.type_mappings:
                fixes += 1
                new_prop_name = self.type_mappings[prop_name]
                self.fix_log.append({
                    'type': 'function_parameter',
                    'old': prop_name,
                    'new': new_prop_name,
                    'context': f'function parameter type: {prop_name} → {new_prop_name}'
                })
                return f"{prefix1}{param_name}{prefix2}{new_prop_name}{suffix}"
            
            return match.group(0)
        
        content = re.sub(param_pattern, replace_param_type, content, flags=re.MULTILINE | re.DOTALL)
        
        return content, fixes
    
    def fix_type_aliases(self, content: str) -> Tuple[str, int]:
        """修复类型别名"""
        fixes = 0
        
        # 匹配type别名定义
        type_alias_pattern = r'(type\s+\w+\s*=\s*\{[^}]*?)([a-zA-Z_][a-zA-Z0-9_]*)(\s*[?:]\s*[^;,}]+[;,]?)'
        
        def replace_type_alias_prop(match):
            nonlocal fixes
            prefix = match.group(1)
            prop_name = match.group(2)
            suffix = match.group(3)
            
            if prop_name in self.type_mappings:
                fixes += 1
                new_prop_name = self.type_mappings[prop_name]
                self.fix_log.append({
                    'type': 'type_alias',
                    'old': prop_name,
                    'new': new_prop_name,
                    'context': f'type alias: {prop_name} → {new_prop_name}'
                })
                return f"{prefix}{new_prop_name}{suffix}"
            
            return match.group(0)
        
        content = re.sub(type_alias_pattern, replace_type_alias_prop, content, flags=re.MULTILINE | re.DOTALL)
        
        return content, fixes
    
    def process_file(self, file_path: Path) -> bool:
        """处理单个文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                original_content = f.read()
            
            content = original_content
            total_fixes = 0
            
            # 应用各种修复
            content, interface_fixes = self.fix_interface_properties(content)
            total_fixes += interface_fixes
            self.stats['interface_fixes'] += interface_fixes
            
            content, type_fixes = self.fix_type_annotations(content)
            total_fixes += type_fixes
            self.stats['type_annotation_fixes'] += type_fixes
            
            content, prop_fixes = self.fix_object_properties(content)
            total_fixes += prop_fixes
            self.stats['property_fixes'] += prop_fixes
            
            content, param_fixes = self.fix_function_parameters(content)
            total_fixes += param_fixes
            self.stats['function_type_fixes'] += param_fixes
            
            content, alias_fixes = self.fix_type_aliases(content)
            total_fixes += alias_fixes
            self.stats['type_annotation_fixes'] += alias_fixes
            
            # 如果有修改，备份并写入新内容
            if content != original_content:
                self.backup_file(file_path)
                
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                self.stats['files_modified'] += 1
                self.stats['total_fixes'] += total_fixes
                
                print(f"✅ 修复文件: {file_path.relative_to(self.project_root)} ({total_fixes}处修复)")
                return True
            
            return False
            
        except Exception as e:
            print(f"❌ 处理文件失败 {file_path}: {e}")
            return False
    
    def run_typescript_check(self) -> bool:
        """运行TypeScript编译检查"""
        try:
            import subprocess
            result = subprocess.run(
                ['npx', 'tsc', '--noEmit'],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if result.returncode == 0:
                print("✅ TypeScript编译检查通过")
                return True
            else:
                print(f"❌ TypeScript编译检查失败:\n{result.stdout}\n{result.stderr}")
                return False
                
        except Exception as e:
            print(f"❌ 运行TypeScript检查失败: {e}")
            return False
    
    def generate_report(self):
        """生成修复报告"""
        report = {
            'timestamp': self.timestamp,
            'stage': 'stage3_type_fixes',
            'summary': {
                'files_processed': self.stats['files_processed'],
                'files_modified': self.stats['files_modified'],
                'total_fixes': self.stats['total_fixes'],
                'interface_fixes': self.stats['interface_fixes'],
                'type_annotation_fixes': self.stats['type_annotation_fixes'],
                'property_fixes': self.stats['property_fixes'],
                'function_type_fixes': self.stats['function_type_fixes']
            },
            'details': self.fix_log
        }
        
        report_file = self.project_root / f'stage3_type_fixes_executed_{self.timestamp}.json'
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"\n📊 修复报告已生成: {report_file}")
        return report
    
    def run(self):
        """执行第三阶段类型定义修复"""
        print("🚀 开始第三阶段：类型定义修复")
        print("=" * 50)
        
        # 创建备份
        self.create_backup()
        
        # 获取目标文件
        target_files = self.get_target_files()
        print(f"📁 找到 {len(target_files)} 个文件需要处理")
        
        # 处理文件
        for file_path in target_files:
            self.stats['files_processed'] += 1
            self.process_file(file_path)
        
        # 运行TypeScript检查
        print("\n🔍 运行TypeScript编译检查...")
        ts_check_passed = self.run_typescript_check()
        
        # 生成报告
        report = self.generate_report()
        
        # 输出总结
        print("\n" + "=" * 50)
        print("🎉 第三阶段类型定义修复完成！")
        print(f"📁 处理文件: {self.stats['files_processed']}个")
        print(f"✏️ 修改文件: {self.stats['files_modified']}个")
        print(f"🔧 总修复数: {self.stats['total_fixes']}处")
        print(f"   - 接口属性修复: {self.stats['interface_fixes']}处")
        print(f"   - 类型注解修复: {self.stats['type_annotation_fixes']}处")
        print(f"   - 对象属性修复: {self.stats['property_fixes']}处")
        print(f"   - 函数类型修复: {self.stats['function_type_fixes']}处")
        print(f"✅ TypeScript编译: {'通过' if ts_check_passed else '失败'}")
        print(f"💾 备份目录: {self.backup_dir}")
        
        return report

if __name__ == '__main__':
    fixer = Stage3TypeFixer()
    fixer.run()