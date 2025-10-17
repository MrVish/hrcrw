#!/usr/bin/env python3
"""
Script to set default values for new client fields.

This script ensures that all existing clients have appropriate default values
for the new enhanced fields (domicile_branch, relationship_manager, business_unit, aml_risk).
"""

import sys
import os
from typing import Dict, List
import logging

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models.client import Client, AMLRiskLevel, RiskLevel

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class ClientDefaultSetter:
    """Sets default values for enhanced client fields."""
    
    # Default mappings based on business logic
    COUNTRY_BRANCH_MAPPING = {
        'US': 'New York Branch',
        'UK': 'London Branch', 
        'GB': 'London Branch',
        'SG': 'Singapore Branch',
        'HK': 'Hong Kong Branch',
        'AU': 'Sydney Branch',
        'CA': 'Toronto Branch',
        'DE': 'Frankfurt Branch',
        'FR': 'Paris Branch',
        'JP': 'Tokyo Branch',
        'CH': 'Zurich Branch',
        'NL': 'Amsterdam Branch',
        'BE': 'Brussels Branch',
        'IT': 'Milan Branch',
        'ES': 'Madrid Branch',
        'SE': 'Stockholm Branch',
        'NO': 'Oslo Branch',
        'DK': 'Copenhagen Branch',
        'FI': 'Helsinki Branch'
    }
    
    RISK_LEVEL_RM_MAPPING = {
        RiskLevel.HIGH: 'Senior RM - High Risk Clients',
        RiskLevel.MEDIUM: 'Standard RM - Medium Risk Clients', 
        RiskLevel.LOW: 'Junior RM - Low Risk Clients'
    }
    
    RISK_LEVEL_BUSINESS_UNIT_MAPPING = {
        RiskLevel.HIGH: 'Private Banking',
        RiskLevel.MEDIUM: 'Commercial Banking',
        RiskLevel.LOW: 'Retail Banking'
    }
    
    RISK_LEVEL_AML_MAPPING = {
        RiskLevel.HIGH: AMLRiskLevel.HIGH,
        RiskLevel.MEDIUM: AMLRiskLevel.MEDIUM,
        RiskLevel.LOW: AMLRiskLevel.LOW
    }
    
    def __init__(self, database_url: str = None):
        """Initialize the default setter."""
        if database_url is None:
            database_url = settings.DATABASE_URL
        
        self.engine = create_engine(database_url)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
    
    def set_defaults(self) -> Dict[str, int]:
        """
        Set default values for all clients missing enhanced fields.
        
        Returns:
            Dictionary with counts of updated fields
        """
        stats = {
            'clients_processed': 0,
            'domicile_branch_set': 0,
            'relationship_manager_set': 0,
            'business_unit_set': 0,
            'aml_risk_set': 0
        }
        
        with self.SessionLocal() as db:
            try:
                # Get all clients
                clients = db.query(Client).all()
                logger.info(f"Processing {len(clients)} clients...")
                
                for client in clients:
                    updated = False
                    
                    # Set domicile branch if missing
                    if client.domicile_branch is None:
                        client.domicile_branch = self._get_default_branch(client)
                        stats['domicile_branch_set'] += 1
                        updated = True
                    
                    # Set relationship manager if missing
                    if client.relationship_manager is None:
                        client.relationship_manager = self._get_default_rm(client)
                        stats['relationship_manager_set'] += 1
                        updated = True
                    
                    # Set business unit if missing
                    if client.business_unit is None:
                        client.business_unit = self._get_default_business_unit(client)
                        stats['business_unit_set'] += 1
                        updated = True
                    
                    # Set AML risk if missing
                    if client.aml_risk is None:
                        client.aml_risk = self._get_default_aml_risk(client)
                        stats['aml_risk_set'] += 1
                        updated = True
                    
                    if updated:
                        stats['clients_processed'] += 1
                
                # Commit all changes
                db.commit()
                logger.info("Successfully set default values for all clients")
                
            except Exception as e:
                db.rollback()
                logger.error(f"Error setting defaults: {str(e)}")
                raise
        
        return stats
    
    def _get_default_branch(self, client: Client) -> str:
        """Get default domicile branch based on client country."""
        return self.COUNTRY_BRANCH_MAPPING.get(
            client.country.upper() if client.country else 'UNKNOWN',
            'Main Branch'
        )
    
    def _get_default_rm(self, client: Client) -> str:
        """Get default relationship manager based on risk level."""
        return self.RISK_LEVEL_RM_MAPPING.get(
            client.risk_level,
            'Standard RM - Unclassified'
        )
    
    def _get_default_business_unit(self, client: Client) -> str:
        """Get default business unit based on risk level."""
        return self.RISK_LEVEL_BUSINESS_UNIT_MAPPING.get(
            client.risk_level,
            'Commercial Banking'
        )
    
    def _get_default_aml_risk(self, client: Client) -> AMLRiskLevel:
        """Get default AML risk based on existing risk level."""
        return self.RISK_LEVEL_AML_MAPPING.get(
            client.risk_level,
            AMLRiskLevel.MEDIUM
        )
    
    def validate_defaults(self) -> Dict[str, int]:
        """
        Validate that all clients have default values set.
        
        Returns:
            Dictionary with validation counts
        """
        validation_stats = {
            'total_clients': 0,
            'missing_domicile_branch': 0,
            'missing_relationship_manager': 0,
            'missing_business_unit': 0,
            'missing_aml_risk': 0
        }
        
        with self.SessionLocal() as db:
            clients = db.query(Client).all()
            validation_stats['total_clients'] = len(clients)
            
            for client in clients:
                if client.domicile_branch is None:
                    validation_stats['missing_domicile_branch'] += 1
                if client.relationship_manager is None:
                    validation_stats['missing_relationship_manager'] += 1
                if client.business_unit is None:
                    validation_stats['missing_business_unit'] += 1
                if client.aml_risk is None:
                    validation_stats['missing_aml_risk'] += 1
        
        return validation_stats
    
    def get_field_distribution(self) -> Dict[str, Dict[str, int]]:
        """
        Get distribution of values for enhanced fields.
        
        Returns:
            Dictionary with field value distributions
        """
        distribution = {
            'domicile_branch': {},
            'relationship_manager': {},
            'business_unit': {},
            'aml_risk': {}
        }
        
        with self.SessionLocal() as db:
            clients = db.query(Client).all()
            
            for client in clients:
                # Count domicile branch distribution
                branch = client.domicile_branch or 'NULL'
                distribution['domicile_branch'][branch] = distribution['domicile_branch'].get(branch, 0) + 1
                
                # Count relationship manager distribution
                rm = client.relationship_manager or 'NULL'
                distribution['relationship_manager'][rm] = distribution['relationship_manager'].get(rm, 0) + 1
                
                # Count business unit distribution
                bu = client.business_unit or 'NULL'
                distribution['business_unit'][bu] = distribution['business_unit'].get(bu, 0) + 1
                
                # Count AML risk distribution
                aml_risk = client.aml_risk.value if client.aml_risk else 'NULL'
                distribution['aml_risk'][aml_risk] = distribution['aml_risk'].get(aml_risk, 0) + 1
        
        return distribution


def main():
    """Main execution function."""
    print("Enhanced Client Review System - Set Client Defaults")
    print("=" * 55)
    
    try:
        setter = ClientDefaultSetter()
        
        # Check current state
        print("\n1. Validating current state...")
        validation_before = setter.validate_defaults()
        print(f"   Total clients: {validation_before['total_clients']}")
        print(f"   Missing domicile branch: {validation_before['missing_domicile_branch']}")
        print(f"   Missing relationship manager: {validation_before['missing_relationship_manager']}")
        print(f"   Missing business unit: {validation_before['missing_business_unit']}")
        print(f"   Missing AML risk: {validation_before['missing_aml_risk']}")
        
        # Set defaults
        print("\n2. Setting default values...")
        stats = setter.set_defaults()
        print(f"   Clients processed: {stats['clients_processed']}")
        print(f"   Domicile branches set: {stats['domicile_branch_set']}")
        print(f"   Relationship managers set: {stats['relationship_manager_set']}")
        print(f"   Business units set: {stats['business_unit_set']}")
        print(f"   AML risks set: {stats['aml_risk_set']}")
        
        # Validate after setting defaults
        print("\n3. Validating after setting defaults...")
        validation_after = setter.validate_defaults()
        print(f"   Missing domicile branch: {validation_after['missing_domicile_branch']}")
        print(f"   Missing relationship manager: {validation_after['missing_relationship_manager']}")
        print(f"   Missing business unit: {validation_after['missing_business_unit']}")
        print(f"   Missing AML risk: {validation_after['missing_aml_risk']}")
        
        # Show distribution
        print("\n4. Field value distribution:")
        distribution = setter.get_field_distribution()
        
        for field_name, values in distribution.items():
            print(f"\n   {field_name.replace('_', ' ').title()}:")
            for value, count in sorted(values.items()):
                print(f"     {value}: {count}")
        
        # Check if all defaults were set successfully
        total_missing = (validation_after['missing_domicile_branch'] + 
                        validation_after['missing_relationship_manager'] + 
                        validation_after['missing_business_unit'] + 
                        validation_after['missing_aml_risk'])
        
        if total_missing == 0:
            print("\n✅ All client defaults set successfully!")
            return 0
        else:
            print(f"\n⚠️  {total_missing} fields still missing defaults")
            return 1
            
    except Exception as e:
        print(f"\n❌ Error setting client defaults: {str(e)}")
        return 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)