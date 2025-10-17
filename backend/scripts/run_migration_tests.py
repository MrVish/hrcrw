#!/usr/bin/env python3
"""
Test runner for exception migration validation tests.

This script runs the comprehensive migration validation tests and provides
detailed reporting on the test results.
"""

import sys
import os
import subprocess
import tempfile
import json
from datetime import datetime
from typing import Dict, Any, List

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class MigrationTestRunner:
    """Runner for migration validation tests."""
    
    def __init__(self):
        """Initialize the test runner."""
        self.backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.test_results = {}
    
    def run_migration_validation_tests(self) -> Dict[str, Any]:
        """Run the migration validation tests."""
        print("🧪 Running Exception Migration Validation Tests")
        print("=" * 60)
        
        test_results = {
            'timestamp': datetime.utcnow().isoformat(),
            'test_suite': 'exception_migration_validation',
            'tests_run': 0,
            'tests_passed': 0,
            'tests_failed': 0,
            'test_details': [],
            'errors': []
        }
        
        try:
            # Run pytest on the migration validation test file
            test_file = os.path.join(self.backend_dir, 'tests', 'test_exception_migration_validation.py')
            
            if not os.path.exists(test_file):
                test_results['errors'].append(f"Test file not found: {test_file}")
                return test_results
            
            # Run pytest with verbose output and JSON reporting
            cmd = [
                sys.executable, '-m', 'pytest',
                test_file,
                '-v',
                '--tb=short',
                '--json-report',
                '--json-report-file=/tmp/migration_test_report.json'
            ]
            
            print(f"Running command: {' '.join(cmd)}")
            
            result = subprocess.run(
                cmd,
                cwd=self.backend_dir,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            test_results['return_code'] = result.returncode
            test_results['stdout'] = result.stdout
            test_results['stderr'] = result.stderr
            
            # Parse JSON report if available
            json_report_path = '/tmp/migration_test_report.json'
            if os.path.exists(json_report_path):
                try:
                    with open(json_report_path, 'r') as f:
                        json_report = json.load(f)
                    
                    test_results['tests_run'] = json_report.get('summary', {}).get('total', 0)
                    test_results['tests_passed'] = json_report.get('summary', {}).get('passed', 0)
                    test_results['tests_failed'] = json_report.get('summary', {}).get('failed', 0)
                    test_results['test_details'] = json_report.get('tests', [])
                    
                except Exception as e:
                    test_results['errors'].append(f"Failed to parse JSON report: {str(e)}")
            
            # Parse stdout for test results if JSON report not available
            if test_results['tests_run'] == 0:
                self._parse_pytest_output(result.stdout, test_results)
            
            print(f"✅ Tests completed with return code: {result.returncode}")
            
        except subprocess.TimeoutExpired:
            test_results['errors'].append("Test execution timed out after 5 minutes")
            print("❌ Test execution timed out")
            
        except Exception as e:
            test_results['errors'].append(f"Failed to run tests: {str(e)}")
            print(f"❌ Failed to run tests: {e}")
        
        return test_results
    
    def _parse_pytest_output(self, stdout: str, test_results: Dict[str, Any]):
        """Parse pytest stdout output for test results."""
        lines = stdout.split('\n')
        
        for line in lines:
            if '::' in line and ('PASSED' in line or 'FAILED' in line):
                test_results['tests_run'] += 1
                
                if 'PASSED' in line:
                    test_results['tests_passed'] += 1
                elif 'FAILED' in line:
                    test_results['tests_failed'] += 1
                
                test_results['test_details'].append({
                    'nodeid': line.split(' ')[0],
                    'outcome': 'passed' if 'PASSED' in line else 'failed'
                })
    
    def run_specific_migration_tests(self) -> Dict[str, Any]:
        """Run specific migration test scenarios."""
        print("\n🔬 Running Specific Migration Test Scenarios")
        print("=" * 60)
        
        scenarios = [
            'test_migration_execution_without_data_loss',
            'test_default_values_set_correctly',
            'test_new_enum_values_available',
            'test_constraint_application',
            'test_rollback_functionality'
        ]
        
        scenario_results = {
            'timestamp': datetime.utcnow().isoformat(),
            'scenarios': {},
            'summary': {
                'total_scenarios': len(scenarios),
                'passed_scenarios': 0,
                'failed_scenarios': 0
            }
        }
        
        for scenario in scenarios:
            print(f"\n📋 Running scenario: {scenario}")
            
            try:
                # Run specific test
                cmd = [
                    sys.executable, '-m', 'pytest',
                    f"tests/test_exception_migration_validation.py::{scenario}",
                    '-v'
                ]
                
                result = subprocess.run(
                    cmd,
                    cwd=self.backend_dir,
                    capture_output=True,
                    text=True,
                    timeout=60
                )
                
                scenario_results['scenarios'][scenario] = {
                    'return_code': result.returncode,
                    'passed': result.returncode == 0,
                    'stdout': result.stdout,
                    'stderr': result.stderr
                }
                
                if result.returncode == 0:
                    scenario_results['summary']['passed_scenarios'] += 1
                    print(f"   ✅ {scenario} PASSED")
                else:
                    scenario_results['summary']['failed_scenarios'] += 1
                    print(f"   ❌ {scenario} FAILED")
                
            except Exception as e:
                scenario_results['scenarios'][scenario] = {
                    'error': str(e),
                    'passed': False
                }
                scenario_results['summary']['failed_scenarios'] += 1
                print(f"   ❌ {scenario} ERROR: {e}")
        
        return scenario_results
    
    def validate_test_coverage(self) -> Dict[str, Any]:
        """Validate that all migration requirements are covered by tests."""
        print("\n📊 Validating Test Coverage")
        print("=" * 60)
        
        # Requirements from the task specification
        requirements = [
            "Test migration execution without data loss",
            "Verify default values are set correctly for existing records",
            "Validate new enum values are available",
            "Test constraint application",
            "Verify rollback functionality"
        ]
        
        # Test methods that should exist
        expected_test_methods = [
            'test_migration_execution_without_data_loss',
            'test_default_values_set_correctly',
            'test_new_enum_values_available',
            'test_constraint_application',
            'test_rollback_functionality',
            'test_indexes_created_successfully',
            'test_migration_idempotency',
            'test_performance_impact_validation'
        ]
        
        coverage_results = {
            'timestamp': datetime.utcnow().isoformat(),
            'requirements_coverage': {},
            'test_methods_found': [],
            'missing_test_methods': [],
            'coverage_percentage': 0
        }
        
        # Check if test file exists and read it
        test_file = os.path.join(self.backend_dir, 'tests', 'test_exception_migration_validation.py')
        
        if os.path.exists(test_file):
            with open(test_file, 'r') as f:
                test_content = f.read()
            
            # Find test methods
            found_methods = []
            for method in expected_test_methods:
                if f"def {method}" in test_content:
                    found_methods.append(method)
                    print(f"   ✅ Found test method: {method}")
                else:
                    coverage_results['missing_test_methods'].append(method)
                    print(f"   ❌ Missing test method: {method}")
            
            coverage_results['test_methods_found'] = found_methods
            coverage_results['coverage_percentage'] = (len(found_methods) / len(expected_test_methods)) * 100
            
            # Map requirements to test methods
            requirement_mapping = {
                requirements[0]: 'test_migration_execution_without_data_loss',
                requirements[1]: 'test_default_values_set_correctly',
                requirements[2]: 'test_new_enum_values_available',
                requirements[3]: 'test_constraint_application',
                requirements[4]: 'test_rollback_functionality'
            }
            
            for req, method in requirement_mapping.items():
                coverage_results['requirements_coverage'][req] = method in found_methods
            
        else:
            coverage_results['error'] = f"Test file not found: {test_file}"
            print(f"   ❌ Test file not found: {test_file}")
        
        print(f"\n📈 Test Coverage: {coverage_results['coverage_percentage']:.1f}%")
        
        return coverage_results
    
    def generate_test_report(self, test_results: Dict[str, Any], scenario_results: Dict[str, Any], 
                           coverage_results: Dict[str, Any]) -> str:
        """Generate a comprehensive test report."""
        report = []
        report.append("=" * 80)
        report.append("EXCEPTION MIGRATION VALIDATION TEST REPORT")
        report.append("=" * 80)
        report.append("")
        
        # Test execution summary
        report.append("TEST EXECUTION SUMMARY:")
        report.append("-" * 40)
        report.append(f"Total tests run: {test_results.get('tests_run', 0)}")
        report.append(f"Tests passed: {test_results.get('tests_passed', 0)}")
        report.append(f"Tests failed: {test_results.get('tests_failed', 0)}")
        
        if test_results.get('errors'):
            report.append("\nERRORS:")
            for error in test_results['errors']:
                report.append(f"  • {error}")
        
        report.append("")
        
        # Scenario results
        report.append("SCENARIO TEST RESULTS:")
        report.append("-" * 40)
        summary = scenario_results.get('summary', {})
        report.append(f"Total scenarios: {summary.get('total_scenarios', 0)}")
        report.append(f"Passed scenarios: {summary.get('passed_scenarios', 0)}")
        report.append(f"Failed scenarios: {summary.get('failed_scenarios', 0)}")
        
        scenarios = scenario_results.get('scenarios', {})
        for scenario, result in scenarios.items():
            status = "✅ PASSED" if result.get('passed', False) else "❌ FAILED"
            report.append(f"  {status} {scenario}")
        
        report.append("")
        
        # Coverage results
        report.append("TEST COVERAGE ANALYSIS:")
        report.append("-" * 40)
        report.append(f"Coverage percentage: {coverage_results.get('coverage_percentage', 0):.1f}%")
        
        requirements_coverage = coverage_results.get('requirements_coverage', {})
        report.append("\nRequirement coverage:")
        for req, covered in requirements_coverage.items():
            status = "✅" if covered else "❌"
            report.append(f"  {status} {req}")
        
        missing_methods = coverage_results.get('missing_test_methods', [])
        if missing_methods:
            report.append("\nMissing test methods:")
            for method in missing_methods:
                report.append(f"  • {method}")
        
        report.append("")
        
        # Overall assessment
        report.append("OVERALL ASSESSMENT:")
        report.append("-" * 40)
        
        total_tests = test_results.get('tests_run', 0)
        passed_tests = test_results.get('tests_passed', 0)
        coverage_pct = coverage_results.get('coverage_percentage', 0)
        
        if total_tests > 0 and passed_tests == total_tests and coverage_pct >= 80:
            report.append("🎉 EXCELLENT: All tests passed with good coverage")
        elif total_tests > 0 and passed_tests / total_tests >= 0.8:
            report.append("✅ GOOD: Most tests passed")
        elif total_tests > 0:
            report.append("⚠️  NEEDS ATTENTION: Some tests failed")
        else:
            report.append("❌ CRITICAL: No tests were run successfully")
        
        report.append("")
        report.append("RECOMMENDATIONS:")
        report.append("-" * 40)
        
        if coverage_pct < 100:
            report.append("• Implement missing test methods to achieve 100% coverage")
        
        if test_results.get('tests_failed', 0) > 0:
            report.append("• Fix failing tests before proceeding with migration")
        
        if not test_results.get('tests_run', 0):
            report.append("• Ensure test environment is properly configured")
        
        report.append("• Run tests in staging environment before production migration")
        report.append("• Create database backup before running migration")
        
        report.append("")
        report.append("=" * 80)
        report.append(f"Report generated at: {datetime.utcnow().isoformat()}")
        report.append("=" * 80)
        
        return "\n".join(report)


def main():
    """Main function to run migration tests."""
    runner = MigrationTestRunner()
    
    print("🚀 Starting Exception Migration Validation Test Suite")
    print("=" * 80)
    
    # Run main test suite
    test_results = runner.run_migration_validation_tests()
    
    # Run specific scenarios
    scenario_results = runner.run_specific_migration_tests()
    
    # Validate coverage
    coverage_results = runner.validate_test_coverage()
    
    # Generate comprehensive report
    report = runner.generate_test_report(test_results, scenario_results, coverage_results)
    
    # Save report to file
    report_file = f"migration_test_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.txt"
    with open(report_file, 'w') as f:
        f.write(report)
    
    print(f"\n📄 Detailed report saved to: {report_file}")
    print("\n" + "=" * 80)
    print("SUMMARY:")
    print(f"Tests run: {test_results.get('tests_run', 0)}")
    print(f"Tests passed: {test_results.get('tests_passed', 0)}")
    print(f"Tests failed: {test_results.get('tests_failed', 0)}")
    print(f"Coverage: {coverage_results.get('coverage_percentage', 0):.1f}%")
    print("=" * 80)
    
    # Print the report to console as well
    print("\n" + report)


if __name__ == "__main__":
    main()